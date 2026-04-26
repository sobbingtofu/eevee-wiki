/**
 * GET /api/pokemons/search?q={검색어}
 *
 * koreanName에 검색어를 포함하는 포켓몬 목록 반환 (드롭다운용)
 *
 * @param q - 국문 포켓몬명 검색어 (예: "이상해")
 * @returns PokemonSearchResponse - { pokemonId, koreanName, korTypes, spriteUrl }[] (최대 20건)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchPokemonTypesMap } from "@/lib/supabase/queryHelpers";
import type { PokemonSearchResponse, ApiErrorResponse } from "@/types/apiTypes";

interface PokemonRow {
  pokemonId: number;
  koreanName: string | null;
  spriteUrl: string | null;
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json<PokemonSearchResponse>([]);
  }

  // ── Step 1: koreanName에 검색어 포함하는 포켓몬 조회 ──────────
  const { data: pokemons, error: pokErr } = await supabaseServer
    .from("TB_POKEMONS")
    .select("pokemonId, koreanName, spriteUrl")
    .not("koreanName", "is", null)
    .ilike("koreanName", `%${q}%`)
    .order("pokemonId")
    .limit(20);

  if (pokErr) {
    console.error("[pokemons/search] TB_POKEMONS 조회 오류:", pokErr.message);
    return NextResponse.json<ApiErrorResponse>(
      { error: "포켓몬 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!pokemons || pokemons.length === 0) {
    return NextResponse.json<PokemonSearchResponse>([]);
  }

  // ── Step 2: 타입 정보 조회 ────────────────────────────────────
  const pokemonIds = (pokemons as PokemonRow[]).map((p) => p.pokemonId);
  const typesMap = await fetchPokemonTypesMap(pokemonIds);

  // ── 응답 조립 ────────────────────────────────────────────────
  const result: PokemonSearchResponse = (pokemons as PokemonRow[])
    .filter((p): p is PokemonRow & { koreanName: string } => p.koreanName != null)
    .map((p) => ({
      pokemonId: p.pokemonId,
      koreanName: p.koreanName,
      korTypes: typesMap.get(p.pokemonId) ?? [],
      spriteUrl: p.spriteUrl,
    }));

  return NextResponse.json<PokemonSearchResponse>(result);
}
