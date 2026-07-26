/**
 * GET /api/moves/[id]/learning-pokemons?version={버전명}
 *
 * 특정 기술 하나를 특정 게임 버전에서 배우는 포켓몬 목록 반환
 * 기술 상세 페이지 하단 UI에서 사용
 *
 * @param id      - 기술 id (경로 파라미터)
 * @param version - TB_GEN_INFO.versionName (쿼리 파라미터, 예: "scarlet-violet")
 * @returns MoveLearningPokemonsResponse
 *          - { pokemonId, koreanName, spriteUrl, korTypes, learnMethods[] }[]
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {isPlayableVersion, fetchPokemonTypesMap} from "@/lib/supabase/queryHelpers";
import type {
  MoveLearningPokemonsResponse,
  MoveLearningPokemonItem,
  MoveLearnEntry,
  LearnMethod,
  ApiErrorResponse,
} from "@/types/apiTypes";

interface TB_POKEMONS_USED_COLUMNS {
  pokemonId: number;
  korName: string | null;
  spriteUrl: string | null;
}

interface TB_CXN_POKEMON_MOVES_USED_COLUMNS {
  pokemonId: number;
  learnMethod: string;
  levelLearnedAt: number;
  versionName: string;
}

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id: rawId} = await params;
  const id = Number(rawId);
  const version = new URL(request.url).searchParams.get("version") ?? "";

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json<ApiErrorResponse>({error: "유효하지 않은 기술 ID입니다."}, {status: 400});
  }

  // Step 1: 버전명 검증
  // 존재하지 않는 버전명은 조용히 0건이 되어버리므로 여기서 400으로 걸러낸다
  if (!(await isPlayableVersion(version))) {
    return NextResponse.json<ApiErrorResponse>(
      {error: `지원하지 않는 버전입니다: ${version || "(누락)"}`},
      {status: 400},
    );
  }

  // Step 2: 해당 기술을 해당 버전에서 배우는 모든 (pokemonId, learnMethod) 조회
  const {data: learnData, error: learnErr} = await supabaseServer
    .from("TB_CXN_POKEMON_MOVES")
    .select("pokemonId, learnMethod, levelLearnedAt, versionName")
    .eq("moveId", id)
    .eq("versionName", version);

  if (learnErr) {
    console.error("[moves/learning-pokemons] 학습 데이터 조회 오류:", learnErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "학습 데이터 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!learnData || learnData.length === 0) {
    return NextResponse.json<MoveLearningPokemonsResponse>([]);
  }

  // Step 3: pokemonId별 학습 방법 그룹화
  // PK가 (pokemonId, moveId, versionName, learnMethod)이므로 단일 버전 내에서는 중복이 없다
  const learnMap = new Map<number, MoveLearnEntry[]>();
  for (const row of learnData as TB_CXN_POKEMON_MOVES_USED_COLUMNS[]) {
    const existing = learnMap.get(row.pokemonId) ?? [];
    existing.push({
      learnMethod: row.learnMethod as LearnMethod,
      levelLearnedAt: row.levelLearnedAt,
      versionName: row.versionName,
    });
    learnMap.set(row.pokemonId, existing);
  }

  const pokemonIds = [...learnMap.keys()];

  // Step 4: 포켓몬 기본 정보 조회
  const {data: pokemons, error: pokErr} = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, korName, spriteUrl")
    .in("pokemonId", pokemonIds)
    .order("pokemonId");

  if (pokErr) {
    console.error("[moves/learning-pokemons] 포켓몬 정보 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "포켓몬 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  // Step 5: 포켓몬 타입 정보 조회
  const typesMap = await fetchPokemonTypesMap(pokemonIds);

  // Step 6: 응답 조립
  const result: MoveLearningPokemonsResponse = (pokemons as TB_POKEMONS_USED_COLUMNS[]).map(
    (p): MoveLearningPokemonItem => ({
      pokemonId: p.pokemonId,
      koreanName: p.korName ?? p.pokemonId.toString(),
      spriteUrl: p.spriteUrl,
      korTypes: typesMap.get(p.pokemonId) ?? [],
      learnMethods: learnMap.get(p.pokemonId) ?? [],
    }),
  );

  return NextResponse.json<MoveLearningPokemonsResponse>(result);
}
