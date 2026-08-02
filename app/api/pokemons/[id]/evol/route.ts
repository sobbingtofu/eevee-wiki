/**
 * GET /api/pokemons/[id]/evol
 *
 * 특정 포켓몬이 속한 진화 체인 전체 반환
 * (포켓몬 상세 페이지 — 진화 체인 UI 렌더링용)
 *
 * 데이터 소스: TB_CXN_EVOLUTIONS
 *
 * @param id - pokemonId (경로 파라미터)
 * @returns PokemonEvolutionChainResponse
 *   chainLevel 오름차순으로 그룹화된 배열
 *   각 그룹 내부는 pokemonId 오름차순 정렬
 *
 * @example 3단계 진화 (이상해씨)
 * [
 *   { chainLevel: 1, chainData: [{ pokemonId: 1,  koreanName: "이상해씨", ... }] },
 *   { chainLevel: 2, chainData: [{ pokemonId: 2,  koreanName: "이상해풀", ... }] },
 *   { chainLevel: 3, chainData: [{ pokemonId: 3,  koreanName: "이상해꽃", ... }] },
 * ]
 *
 * @example 지역폼 분기 (나옹)
 * [
 *   { chainLevel: 1, chainData: [나옹, 나옹(알로라), 나옹(가라르)] },
 *   { chainLevel: 2, chainData: [페르시온, 페르시온(알로라), 나이킹] },
 * ]
 *
 * @example 8갈래 분기 (이브이)
 * [
 *   { chainLevel: 1, chainData: [이브이] },
 *   { chainLevel: 2, chainData: [샤미드, 쥬피썬더, 부스터, 에브이, 블래키, 리피아, 글레이시아, 님피아] },
 * ]
 *
 * @note TB_CXN_EVOLUTIONS에 없는 포켓몬(mega 폼 등 필터링된 폼) 요청 시 404 반환
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchPokemonTypesMap} from "@/lib/supabase/queryHelpers";
import type {
  PokemonEvolutionChainResponse,
  EvolutionChainMember,
  EvolutionDetailEntry,
  ApiErrorResponse,
} from "@/types/apiTypes";
import {API_CACHE_CONTROL, cacheHeaders} from "@/lib/apiCache";

// ── DB 로우 형태 ──────────────────────────────────────────────────
interface EvolRow {
  evolutionChainId: number;
  chainLevel: number;
  pokemonId: number;
  speciesNameEn: string;
  speciesNameKo: string | null;
  varietyNameEn: string;
  varietyNameKo: string | null;
  varietyKeyword: string;
  spriteUrl: string | null;
  officialArtworkUrl: string | null;
  parentPokemonId: number | null;
  evolutionDetails: EvolutionDetailEntry[] | null;
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id: rawId} = await params;
  const pokemonId = Number(rawId);

  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return NextResponse.json<ApiErrorResponse>({error: "유효하지 않은 포켓몬 ID입니다."}, {status: 400});
  }

  // Step 1: 해당 pokemonId가 속한 evolutionChainId 조회
  const {data: selfRow, error: selfErr} = await supabaseServer
    .from("TB_CXN_EVOLUTIONS")
    .select("evolutionChainId")
    .eq("pokemonId", pokemonId)
    .maybeSingle();

  if (selfErr) {
    console.error("[pokemons/evol] 체인 ID 조회 오류:", selfErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "진화 체인 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!selfRow) {
    // TB_CXN_EVOLUTIONS에 없는 포켓몬 (mega/gmax 등 필터링된 폼)
    return NextResponse.json<ApiErrorResponse>(
      {error: `포켓몬 ID ${pokemonId}의 진화 체인 데이터가 없습니다.`},
      {status: 404},
    );
  }

  const {evolutionChainId} = selfRow as {evolutionChainId: number};

  // Step 2: 해당 체인의 전체 구성원 조회
  const {data: chainRows, error: chainErr} = await supabaseServer
    .from("TB_CXN_EVOLUTIONS")
    .select(
      "evolutionChainId, chainLevel, pokemonId, " +
        "speciesNameEn, speciesNameKo, " +
        "varietyNameEn, varietyNameKo, varietyKeyword, " +
        "spriteUrl, officialArtworkUrl, " +
        "parentPokemonId, evolutionDetails",
    )
    .eq("evolutionChainId", evolutionChainId)
    .order("chainLevel")
    .order("pokemonId");

  if (chainErr) {
    console.error("[pokemons/evol] 체인 구성원 조회 오류:", chainErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "진화 체인 구성원 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!chainRows || chainRows.length === 0) {
    return NextResponse.json<ApiErrorResponse>({error: "진화 체인 데이터가 비어 있습니다."}, {status: 404});
  }

  // Step 3: 구성원들의 타입 정보 조회
  // TB_CXN_POKEMON_TYPES에 없는 pokemonId(DB 미보유 폼)는 빈 배열 반환
  const rows = chainRows as unknown as EvolRow[];

  const memberIds = rows.map((r) => r.pokemonId);
  const typesMap = await fetchPokemonTypesMap(memberIds);

  // Step 4: chainLevel 기준으로 그룹화
  const grouped = new Map<number, EvolutionChainMember[]>();

  for (const row of rows) {
    const member: EvolutionChainMember = {
      pokemonId: row.pokemonId,
      chainLevel: row.chainLevel,
      parentPokemonId: row.parentPokemonId,
      speciesNameEn: row.speciesNameEn,
      speciesNameKo: row.speciesNameKo,
      varietyNameEn: row.varietyNameEn,
      varietyNameKo: row.varietyNameKo,
      varietyKeyword: row.varietyKeyword,
      spriteUrl: row.spriteUrl,
      officialArtworkUrl: row.officialArtworkUrl,
      korTypes: typesMap.get(row.pokemonId) ?? [],
      evolutionDetails: row.evolutionDetails,
    };

    const existing = grouped.get(row.chainLevel) ?? [];
    existing.push(member);
    grouped.set(row.chainLevel, existing);
  }

  // Step 5: chainLevel 오름차순 정렬 후 응답 구성
  const result: PokemonEvolutionChainResponse = Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([chainLevel, chainData]) => ({chainLevel, chainData}));

  return NextResponse.json<PokemonEvolutionChainResponse>(result, cacheHeaders(API_CACHE_CONTROL.DETAIL));
}
