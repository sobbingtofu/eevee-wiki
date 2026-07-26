/**
 * POST /api/search-learning-pokemons
 *
 * 지정된 게임 버전에서 복수의 기술을 모두 배우는 포켓몬을 정렬 옵션 및 필터에 따라 검색
 *
 * Request body: SearchLearningPokemonsRequest
 *   { moveIds: number[], versionName: string }
 *
 * @returns SearchLearningPokemonsResponse
 *   { pokemonId, koreanName, spriteUrl, korTypes, stats, evStats,
 *     moveLearnInfo: Record<moveId_str, MoveLearnEntry[]> }[]
 *
 * 알고리즘:
 *   1. versionName 유효성 검증 (TB_GEN_INFO)
 *   2. 각 moveId별 해당 버전에서 배우는 pokemonId 집합 병렬 조회
 *   3. 모든 집합의 교집합(intersection) 계산
 *   4. 교집합 포켓몬들의 기본정보 + 타입 + 기술별 학습방법 조회
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchVersionLearnMethods, fetchPokemonTypesMap, fetchLearnInfoMap} from "@/lib/supabase/queryHelpers";
import {sortLearningPokemons} from "@/lib/supabase/sortLearningPokemons";
import {LEARN_METHOD_FILTERS, POKEMON_SORT_KEYS, SORT_DIRECTIONS} from "@/types/apiTypes";
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

export async function POST(request: NextRequest) {
  // Step 0: 요청 파싱 및 유효성 검사
  let body: SearchLearningPokemonsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>({error: "요청 본문이 유효한 JSON이 아닙니다."}, {status: 400});
  }

  const {moveIds, versionName, sortKey, sortDirection, learnMethods} = body;

  if (!Array.isArray(moveIds) || moveIds.length < 1) {
    return NextResponse.json<ApiErrorResponse>(
      {error: "moveIds는 1개 이상의 기술 ID 배열이어야 합니다."},
      {status: 400},
    );
  }
  if (moveIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return NextResponse.json<ApiErrorResponse>({error: "moveIds의 모든 값은 양의 정수여야 합니다."}, {status: 400});
  }
  // 존재하지 않는 버전명은 조용히 0건이 되어버리므로 여기서 400으로 걸러낸다.
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

  // 버전에 없는 방법은 걸러낸다.
  // 예: champions는 "train"만 존재하므로 레벨업/기술머신/기술가르침은 무의미하다.
  // 교집합이 비면 자격을 만족할 방법이 아예 없다는 뜻이므로 빈 결과.
  const effectiveMethods = learnMethods.filter((m) => availableMethods.includes(m));
  if (effectiveMethods.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
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
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  const qualifyingIds: Set<number> = idSets.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));

  if (qualifyingIds.size === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  const pokemonIds = [...qualifyingIds];

  // ── Step 3: 포켓몬 기본 정보 조회 ────────────────────────────
  const {data: pokemons, error: pokErr} = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, korName, spriteUrl, stats, evStats")
    .in("pokemonId", pokemonIds)
    .order("pokemonId");

  if (pokErr) {
    console.error("[search-learning-pokemons] 포켓몬 정보 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "포켓몬 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!pokemons || pokemons.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  // ── Step 4: 타입 정보 조회 ────────────────────────────────────
  const typesMap = await fetchPokemonTypesMap(pokemonIds);

  // ── Step 5: 각 포켓몬-기술 조합의 버전 내 학습방법 조회 ───────
  // Map<pokemonId, Map<moveId, MoveLearnEntry[]>>
  const learnInfoMap = await fetchLearnInfoMap(pokemonIds, moveIds, versionName);

  // ── 응답 조립 ────────────────────────────────────────────────
  const result: SearchLearningPokemonsResponse = (pokemons as PokemonRow[]).map((p): LearningPokemonItem => {
    const pokemonLearnMap = learnInfoMap.get(p.pokemonId) ?? new Map();

    // Record<moveId_string, MoveLearnEntry[]>
    const moveLearnInfo: LearningPokemonItem["moveLearnInfo"] = {};
    for (const moveId of moveIds) {
      moveLearnInfo[moveId.toString()] = pokemonLearnMap.get(moveId) ?? [];
    }

    return {
      pokemonId: p.pokemonId,
      koreanName: p.korName ?? p.pokemonId.toString(),
      spriteUrl: p.spriteUrl,
      korTypes: typesMap.get(p.pokemonId) ?? [],
      stats: p.stats ?? [],
      evStats: p.evStats ?? [],
      moveLearnInfo,
    };
  });

  // ── Step 6: 정렬 (서버 처리) ─────────────────────────────────
  const sortedResult = sortLearningPokemons(result, sortKey, sortDirection);

  return NextResponse.json<SearchLearningPokemonsResponse>(sortedResult);
}
