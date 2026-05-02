/**
 * GET /api/pokemons/[id]
 *
 * - 특정 포켓몬의 상세 정보 반환, 포켓몬 상세 페이지 기본 정보
 * - 진화 체인은 별도 /api/pokemons/[id]/evol 엔드포인트로 분리
 * - 기술 목록은 별도 /api/pokemons/[id]/moves 엔드포인트로 분리
 *
 * @param id - pokemonId (경로 파라미터)
 * @returns PokemonDetail
 *          - pokemonId, koreanName, officialArtworkUrl, spriteUrl,
 *            korTypes, stats, evStats, abilities[]
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchPokemonTypesMap} from "@/lib/supabase/queryHelpers";
import type {PokemonDetail, PokemonAbilityInfo, StatEntry, EvStatEntry, ApiErrorResponse} from "@/types/apiTypes";

interface TB_POKEMONS_USED_COLUMNS {
  pokemonId: number;
  speciesId: number | null;
  koreanName: string | null;
  officialArtworkUrl: string | null;
  spriteUrl: string | null;
  stats: StatEntry[] | null;
  evStats: EvStatEntry[] | null;
}

interface TB_CXN_POKEMON_ABILITIES_USED_COLUMNS {
  abilityId: number;
  isHidden: boolean;
}

interface TB_ABILITIES_USED_COLUMNS {
  id: number;
  koreanName: string | null;
  altKorName: string | null;
  korDescription: string | null;
  altKorDescription: string | null;
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id: rawId} = await params;
  const pokemonId = Number(rawId);

  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return NextResponse.json<ApiErrorResponse>({error: "유효하지 않은 포켓몬 ID입니다."}, {status: 400});
  }

  // Step 1: 포켓몬 기본 정보 조회
  const {data: pokemon, error: pokErr} = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, speciesId, koreanName, officialArtworkUrl, spriteUrl, stats, evStats")
    .eq("pokemonId", pokemonId)
    .maybeSingle();

  if (pokErr) {
    console.error("[pokemons/id] TB_POKEMONS 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "포켓몬 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!pokemon) {
    return NextResponse.json<ApiErrorResponse>(
      {error: `ID ${pokemonId}에 해당하는 포켓몬을 찾을 수 없습니다.`},
      {status: 404},
    );
  }

  const p = pokemon as TB_POKEMONS_USED_COLUMNS;

  // Step 2: 타입 정보 조회
  const typesMap = await fetchPokemonTypesMap([pokemonId]);
  const korTypes = typesMap.get(pokemonId) ?? [];

  // Step 3: 특성 연결 정보 조회
  const {data: abilityLinks, error: linkErr} = await supabaseServer
    .from("TB_CXN_POKEMON_ABILITIES")
    .select("abilityId, isHidden")
    .eq("pokemonId", pokemonId)
    .order("isHidden"); // false(일반 특성) 먼저

  if (linkErr) {
    console.error("[pokemons/id] 특성 링크 조회 오류:", linkErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "특성 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  // Step 4: 특성 상세 정보 조회
  let abilities: PokemonAbilityInfo[] = [];

  if (abilityLinks && abilityLinks.length > 0) {
    const abilityIds = (abilityLinks as TB_CXN_POKEMON_ABILITIES_USED_COLUMNS[]).map((a) => a.abilityId);

    const {data: abilityDetails, error: abilErr} = await supabaseServer
      .from("TB_ABILITIES")
      .select("id, koreanName, altKorName, korDescription, altKorDescription")
      .in("id", abilityIds);

    if (abilErr) {
      console.error("[pokemons/id] TB_ABILITIES 조회 오류:", abilErr.message);
      return NextResponse.json<ApiErrorResponse>({error: "특성 상세 정보 조회 중 오류가 발생했습니다."}, {status: 500});
    }

    // abilityId → 상세 정보 맵
    const abilityDetailMap = new Map<number, TB_ABILITIES_USED_COLUMNS>(
      ((abilityDetails ?? []) as TB_ABILITIES_USED_COLUMNS[]).map((a) => [a.id, a]),
    );

    // 특성 링크 순서 유지하며 조립 (isHidden=false 먼저)
    abilities = (abilityLinks as TB_CXN_POKEMON_ABILITIES_USED_COLUMNS[])
      .map((link): PokemonAbilityInfo | null => {
        const detail = abilityDetailMap.get(link.abilityId);
        if (!detail) return null;

        const displayName = detail.koreanName ?? detail.altKorName ?? `ability_${detail.id}`;
        const displayDescription = detail.korDescription ?? detail.altKorDescription ?? null;

        return {
          abilityId: detail.id,
          koreanName: detail.koreanName,
          altKorName: detail.altKorName,
          displayName,
          korDescription: detail.korDescription,
          altKorDescription: detail.altKorDescription,
          displayDescription,
          isHidden: link.isHidden,
        };
      })
      .filter((a): a is PokemonAbilityInfo => a !== null);
  }

  // Step 5: 응답 조립
  const result: PokemonDetail = {
    pokemonId: p.pokemonId,
    speciesId: p.speciesId,
    koreanName: p.koreanName ?? p.pokemonId.toString(),
    officialArtworkUrl: p.officialArtworkUrl,
    spriteUrl: p.spriteUrl,
    korTypes,
    stats: p.stats ?? [],
    evStats: p.evStats ?? [],
    abilities,
  };

  return NextResponse.json<PokemonDetail>(result);
}
