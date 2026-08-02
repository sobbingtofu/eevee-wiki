/**
 * POST /api/search-learning-pokemons
 *
 * 지정된 게임 버전에서 복수의 기술을 모두 배우는 포켓몬을 정렬 옵션 및 필터에 따라 검색
 *
 * Request body: SearchLearningPokemonsRequest
 *   { moveIds, versionName, sortKey, sortDirection, learnMethods, page }
 *
 * @returns SearchLearningPokemonsResponse
 *   { items, totalCount, page, hasNextPage }
 *
 * 알고리즘:
 *   1. versionName 유효성 검증 (TB_GEN_INFO)
 *   2. 각 moveId별 해당 버전에서 배우는 pokemonId 집합 병렬 조회
 *   3. 모든 집합의 교집합(intersection) 계산 → 자격 포켓몬 전원
 *   4. 전원의 이름·스탯 조회 후 정렬, 요청된 페이지 구간만 잘라냄
 *   5. 잘라낸 24마리에 대해서만 타입 + 기술별 학습방법 조회
 *
 * 페이지네이션 설계 메모:
 *   정렬 기준이 국문명(ko 로케일)과 stats JSONB 합산이라 PostgREST .order()로 표현할 수 없어,
 *   Next JS api 서버에서 정렬 수행함. ("DB에서 24행만 읽기"는 현재 구조에선 불가능함)
 *   대신 무게가 다른 세 조회를 정렬 전후로 나눔:
 *     이름·스탯(정렬에 필요) → 전원 조회
 *     타입 + 학습방법(정렬에 불필요, 응답 크기의 대부분) → 24마리치만 조회
 *   이 덕분에 페이지 1개에 대한 응답은 약 14KB까지 축소됨
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchVersionLearnMethods, fetchPokemonTypesMap, fetchLearnInfoMap} from "@/lib/supabase/queryHelpers";
import {sortLearningPokemons} from "@/lib/supabase/sortLearningPokemons";
import {
  LEARN_METHOD_FILTERS,
  POKEMON_SORT_KEYS,
  SEARCH_LEARNING_POKEMONS_PAGE_SIZE,
  SORT_DIRECTIONS,
} from "@/types/apiTypes";
import type {
  SearchLearningPokemonsRequest,
  SearchLearningPokemonsResponse,
  LearningPokemonItem,
  StatEntry,
  EvStatEntry,
  ApiErrorResponse,
} from "@/types/apiTypes";

interface PokemonRow {
  pokemonId: number;
  korName: string | null;
  spriteUrl: string | null;
  stats: StatEntry[] | null;
  evStats: EvStatEntry[] | null;
}

/**
 * 정렬 대상이 되는 중간 형태
 *
 * `korName`/`stats`의 null을 여기서 한 번 털어내
 * 정렬 함수와 최종 응답 조립이 같은 값을 보도록 함
 */
interface SortableRow {
  pokemonId: number;
  koreanName: string;
  spriteUrl: string | null;
  stats: StatEntry[];
  evStats: EvStatEntry[];
}

/** 결과가 0건일 때의 응답 (여러 조기 반환 지점에서 형태를 통일) */
function emptyPage(page: number): SearchLearningPokemonsResponse {
  return {items: [], totalCount: 0, page, hasNextPage: false};
}

export async function POST(request: NextRequest) {
  // Step 0: 요청 파싱 및 유효성 검사
  let body: SearchLearningPokemonsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>({error: "요청 본문이 유효한 JSON이 아닙니다."}, {status: 400});
  }

  const {moveIds, versionName, sortKey, sortDirection, learnMethods, page} = body;

  if (!Number.isInteger(page) || page < 0) {
    return NextResponse.json<ApiErrorResponse>({error: "page는 0 이상의 정수여야 합니다."}, {status: 400});
  }
  if (!Array.isArray(moveIds) || moveIds.length < 1) {
    return NextResponse.json<ApiErrorResponse>(
      {error: "moveIds는 1개 이상의 기술 ID 배열이어야 합니다."},
      {status: 400},
    );
  }
  if (moveIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return NextResponse.json<ApiErrorResponse>({error: "moveIds의 모든 값은 양의 정수여야 합니다."}, {status: 400});
  }
  // 존재하지 않는 버전명은 조용히 0건이 되어버리므로 여기서 400으로 걸러내야 함
  // (유효한 버전이면 learnMethods가 최소 1개는 있으므로 빈 배열 = 무효한 버전)
  const availableMethods = typeof versionName === "string" ? await fetchVersionLearnMethods(versionName) : [];
  if (availableMethods.length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      {error: `지원하지 않는 버전입니다: ${versionName || "(누락)"}`},
      {status: 400},
    );
  }
  if (!POKEMON_SORT_KEYS.includes(sortKey)) {
    return NextResponse.json<ApiErrorResponse>({error: "sortKey 값이 올바르지 않습니다."}, {status: 400});
  }
  if (!SORT_DIRECTIONS.includes(sortDirection)) {
    return NextResponse.json<ApiErrorResponse>({error: "sortDirection 값이 올바르지 않습니다."}, {status: 400});
  }
  if (!Array.isArray(learnMethods) || learnMethods.length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      {error: "learnMethods는 1개 이상의 배우는 방법 배열이어야 합니다."},
      {status: 400},
    );
  }
  if (learnMethods.some((method) => !LEARN_METHOD_FILTERS.includes(method))) {
    return NextResponse.json<ApiErrorResponse>({error: "learnMethods에 허용되지 않은 값이 있습니다."}, {status: 400});
  }

  // 버전에 없는 기술은 걸러냄
  // 예: champions는 "train"만 존재하므로 레벨업/기술머신/기술가르침은 무의미함
  // 교집합이 비면 자격을 만족할 방법이 아예 없다는 뜻이므로 빈 결과 페이지 반환하면 됨
  const effectiveMethods = learnMethods.filter((m) => availableMethods.includes(m));
  if (effectiveMethods.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>(emptyPage(page));
  }

  // ── Step 1: 각 moveId별 배우는 pokemonId 집합을 병렬 조회 ────
  // 배우는 방법 필터(learnMethods)는 "자격 판정"에만 적용 → 여기서 learnMethod 필터링.
  // (표시용 학습방법은 Step 5에서 필터 없이 전체 조회하므로 카드에는 모든 방법이 노출됨)
  const idSetPromises = moveIds.map(async (moveId): Promise<Set<number>> => {
    const {data, error} = await supabaseServer
      .from("TB_CXN_POKEMON_MOVES")
      .select("pokemonId")
      .eq("moveId", moveId)
      .eq("versionName", versionName)
      .in("learnMethod", effectiveMethods);

    if (error || !data) return new Set();
    return new Set((data as {pokemonId: number}[]).map((r) => r.pokemonId));
  });

  const idSets = await Promise.all(idSetPromises);

  // ── Step 2: 교집합 계산 ──────────────────────────────────────
  // 빈 집합이 하나라도 있으면 교집합은 반드시 공집합
  if (idSets.some((s) => s.size === 0)) {
    return NextResponse.json<SearchLearningPokemonsResponse>(emptyPage(page));
  }

  const qualifyingIds: Set<number> = idSets.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));

  if (qualifyingIds.size === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>(emptyPage(page));
  }

  const pokemonIds = [...qualifyingIds];

  // ── Step 3: 자격 포켓몬 "전원"의 이름·스탯 조회 ───────────────
  // 정렬 기준(국문명 / 스탯 합산)이 이 두 값이라 전체를 봐야 순서 정할 수 있음
  // 무거운 타입·학습방법 조회는 정렬해서 반환한 뒤 페이지를 고른 뒤로 미룸
  const {data: pokemons, error: pokErr} = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, korName, spriteUrl, stats, evStats")
    .in("pokemonId", pokemonIds);

  if (pokErr) {
    console.error("[search-learning-pokemons] 포켓몬 정보 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "포켓몬 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!pokemons || pokemons.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>(emptyPage(page));
  }

  const sortableRows: SortableRow[] = (pokemons as PokemonRow[]).map((p) => ({
    pokemonId: p.pokemonId,
    koreanName: p.korName ?? p.pokemonId.toString(),
    spriteUrl: p.spriteUrl,
    stats: p.stats ?? [],
    evStats: p.evStats ?? [],
  }));

  // ── Step 4: 정렬 후 요청된 페이지 구간만 잘라내기 ─────────────
  // 정렬 함수가 동점을 pokemonId 오름차순으로 고정함
  const sortedRows = sortLearningPokemons(sortableRows, sortKey, sortDirection);

  const totalCount = sortedRows.length;
  const offset = page * SEARCH_LEARNING_POKEMONS_PAGE_SIZE;
  const pageRows = sortedRows.slice(offset, offset + SEARCH_LEARNING_POKEMONS_PAGE_SIZE);

  // 범위를 넘어선 페이지 요청은 에러가 아니라 빈 페이지로 돌려줌
  // => 감지 요소가 마지막 페이지 직후에 한 번 더 트리거되는 경우를 조용히 흡수
  if (pageRows.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>({items: [], totalCount, page, hasNextPage: false});
  }

  const pageIds = pageRows.map((r) => r.pokemonId);

  // ── Step 5: 이번 페이지 24마리치의 타입 / 학습방법 조회 ───────
  // 둘 다 pageIds만 있으면 되고 서로 의존하지 않으므로 함께 띄움
  const [typesMap, learnInfoMap] = await Promise.all([
    fetchPokemonTypesMap(pageIds),
    // Map<pokemonId, Map<moveId, MoveLearnEntry[]>>
    fetchLearnInfoMap(pageIds, moveIds, versionName),
  ]);

  // ── Step 6: 응답 조립 (정렬된 순서 유지) ──────────────────────
  const items: LearningPokemonItem[] = pageRows.map((row): LearningPokemonItem => {
    const pokemonLearnMap = learnInfoMap.get(row.pokemonId) ?? new Map();

    // Record<moveId_string, MoveLearnEntry[]>
    const moveLearnInfo: LearningPokemonItem["moveLearnInfo"] = {};
    for (const moveId of moveIds) {
      moveLearnInfo[moveId.toString()] = pokemonLearnMap.get(moveId) ?? [];
    }

    return {
      pokemonId: row.pokemonId,
      koreanName: row.koreanName,
      spriteUrl: row.spriteUrl,
      korTypes: typesMap.get(row.pokemonId) ?? [],
      stats: row.stats,
      evStats: row.evStats,
      moveLearnInfo,
    };
  });

  return NextResponse.json<SearchLearningPokemonsResponse>({
    items,
    totalCount,
    page,
    hasNextPage: offset + items.length < totalCount,
  });
}
