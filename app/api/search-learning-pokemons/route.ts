/**
 * POST /api/search-learning-pokemons
 *
 * 지정된 세대에서 복수의 기술을 모두 배우는 포켓몬 검색
 *
 * Request body: SearchLearningPokemonsRequest
 *   { moveIds: number[], genNumber: number }
 *
 * @returns SearchLearningPokemonsResponse
 *   { pokemonId, koreanName, spriteUrl, korTypes, stats, evStats,
 *     moveLearnInfo: Record<moveId_str, MoveLearnEntry[]> }[]
 *
 * 알고리즘:
 *   1. genNumber → versionNames (TB_GEN_INFO)
 *   2. 각 moveId별 해당 세대에서 배우는 pokemonId 집합 병렬 조회
 *   3. 모든 집합의 교집합(intersection) 계산
 *   4. 교집합 포켓몬들의 기본정보 + 타입 + 기술별 학습방법 조회
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchGenVersionNames,
  fetchPokemonTypesMap,
  fetchLearnInfoMap,
} from "@/lib/supabase/queryHelpers";
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
  koreanName: string | null;
  spriteUrl: string | null;
  stats: StatEntry[] | null;
  evStats: EvStatEntry[] | null;
}

export async function POST(request: NextRequest) {
  // ── 요청 파싱 및 유효성 검사 ─────────────────────────────────
  let body: SearchLearningPokemonsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "요청 본문이 유효한 JSON이 아닙니다." },
      { status: 400 }
    );
  }

  const { moveIds, genNumber } = body;

  if (!Array.isArray(moveIds) || moveIds.length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "moveIds는 1개 이상의 기술 ID 배열이어야 합니다." },
      { status: 400 }
    );
  }
  if (moveIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "moveIds의 모든 값은 양의 정수여야 합니다." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(genNumber) || genNumber < 1 || genNumber > 9) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "genNumber는 1~9 사이의 정수여야 합니다." },
      { status: 400 }
    );
  }

  // ── Step 1: 해당 세대의 버전명 목록 ──────────────────────────
  const versionNames = await fetchGenVersionNames(genNumber);
  if (versionNames.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  // ── Step 2: 각 moveId별 배우는 pokemonId 집합을 병렬 조회 ────
  const idSetPromises = moveIds.map(async (moveId): Promise<Set<number>> => {
    const { data, error } = await supabaseServer
      .from("TB_CXN_POKEMON_MOVES")
      .select("pokemonId")
      .eq("moveId", moveId)
      .in("versionName", versionNames);

    if (error || !data) return new Set();
    return new Set((data as { pokemonId: number }[]).map((r) => r.pokemonId));
  });

  const idSets = await Promise.all(idSetPromises);

  // ── Step 3: 교집합 계산 ──────────────────────────────────────
  // 빈 집합이 하나라도 있으면 교집합은 반드시 공집합
  if (idSets.some((s) => s.size === 0)) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  const qualifyingIds: Set<number> = idSets.reduce(
    (acc, set) => new Set([...acc].filter((id) => set.has(id)))
  );

  if (qualifyingIds.size === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  const pokemonIds = [...qualifyingIds];

  // ── Step 4: 포켓몬 기본 정보 조회 ────────────────────────────
  const { data: pokemons, error: pokErr } = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, koreanName, spriteUrl, stats, evStats")
    .in("pokemonId", pokemonIds)
    .order("pokemonId");

  if (pokErr) {
    console.error("[search-learning-pokemons] 포켓몬 정보 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>(
      { error: "포켓몬 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!pokemons || pokemons.length === 0) {
    return NextResponse.json<SearchLearningPokemonsResponse>([]);
  }

  // ── Step 5: 타입 정보 조회 ────────────────────────────────────
  const typesMap = await fetchPokemonTypesMap(pokemonIds);

  // ── Step 6: 각 포켓몬-기술 조합의 세대 내 학습방법 조회 ───────
  // Map<pokemonId, Map<moveId, MoveLearnEntry[]>>
  const learnInfoMap = await fetchLearnInfoMap(pokemonIds, moveIds, versionNames);

  // ── 응답 조립 ────────────────────────────────────────────────
  const result: SearchLearningPokemonsResponse = (pokemons as PokemonRow[]).map(
    (p): LearningPokemonItem => {
      const pokemonLearnMap = learnInfoMap.get(p.pokemonId) ?? new Map();

      // Record<moveId_string, MoveLearnEntry[]>
      const moveLearnInfo: LearningPokemonItem["moveLearnInfo"] = {};
      for (const moveId of moveIds) {
        moveLearnInfo[moveId.toString()] = pokemonLearnMap.get(moveId) ?? [];
      }

      return {
        pokemonId: p.pokemonId,
        koreanName: p.koreanName ?? p.pokemonId.toString(),
        spriteUrl: p.spriteUrl,
        korTypes: typesMap.get(p.pokemonId) ?? [],
        stats: p.stats ?? [],
        evStats: p.evStats ?? [],
        moveLearnInfo,
      };
    }
  );

  return NextResponse.json<SearchLearningPokemonsResponse>(result);
}
