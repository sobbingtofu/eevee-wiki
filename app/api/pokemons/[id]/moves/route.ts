/**
 * GET /api/pokemons/[id]/moves?gen={세대번호}
 *
 * 특정 포켓몬이 특정 세대에서 배울 수 있는 기술 목록 반환
 * (포켓몬 상세 페이지 - 세대별 기술 목록)
 *
 * @param id  - pokemonId (경로 파라미터)
 * @param gen - 세대 번호 1~9 (쿼리 파라미터)
 * @returns PokemonMovesResponse
 *          - { moveId, koreanName, korType, power, accuracy, pp,
 *              damageClass, korDescription, learnMethods[] }[]
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchGenVersionNames,
  fetchTypeMap,
} from "@/lib/supabase/queryHelpers";
import type {
  PokemonMovesResponse,
  PokemonMoveItem,
  PokemonMoveLearnEntry,
  LearnMethod,
  DamageClass,
  ApiErrorResponse,
} from "@/types/apiTypes";

interface LearnRow {
  moveId: number;
  learnMethod: string;
  levelLearnedAt: number;
  versionName: string;
}

interface MoveDetailRow {
  id: number;
  koreanName: string | null;
  typeId: number | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: DamageClass | null;
  korDescription: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const pokemonId = Number(rawId);
  const gen = Number(new URL(request.url).searchParams.get("gen") ?? "0");

  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "유효하지 않은 포켓몬 ID입니다." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(gen) || gen < 1 || gen > 9) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "gen 파라미터는 1~9 사이의 정수여야 합니다." },
      { status: 400 }
    );
  }

  // ── Step 1: 해당 세대의 버전명 목록 ──────────────────────────
  const versionNames = await fetchGenVersionNames(gen);
  if (versionNames.length === 0) {
    return NextResponse.json<PokemonMovesResponse>([]);
  }

  // ── Step 2: 해당 포켓몬이 해당 세대에서 배우는 기술 학습 데이터 조회 ──
  const { data: learnData, error: learnErr } = await supabaseServer
    .from("TB_CXN_POKEMON_MOVES")
    .select("moveId, learnMethod, levelLearnedAt, versionName")
    .eq("pokemonId", pokemonId)
    .in("versionName", versionNames);

  if (learnErr) {
    console.error("[pokemons/moves] 학습 데이터 조회 오류:", learnErr.message);
    return NextResponse.json<ApiErrorResponse>(
      { error: "기술 학습 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!learnData || learnData.length === 0) {
    return NextResponse.json<PokemonMovesResponse>([]);
  }

  // ── Step 3: moveId별 학습방법 그룹화 (learnMethod+level 기준 dedup) ──
  const learnMap = new Map<number, PokemonMoveLearnEntry[]>();
  for (const row of learnData as LearnRow[]) {
    const existing = learnMap.get(row.moveId) ?? [];
    const key = `${row.learnMethod}|${row.levelLearnedAt}`;
    const isDup = existing.some(
      (e) => `${e.learnMethod}|${e.levelLearnedAt}` === key
    );
    if (!isDup) {
      existing.push({
        learnMethod: row.learnMethod as LearnMethod,
        levelLearnedAt: row.levelLearnedAt,
        versionName: row.versionName,
      });
    }
    learnMap.set(row.moveId, existing);
  }

  const moveIds = [...learnMap.keys()];

  // ── Step 4: 기술 상세 정보 조회 ──────────────────────────────
  const { data: moveDetails, error: moveErr } = await supabaseServer
    .from("TB_MOVES")
    .select("id, koreanName, typeId, power, accuracy, pp, damageClass, korDescription")
    .in("id", moveIds);

  if (moveErr) {
    console.error("[pokemons/moves] 기술 정보 조회 오류:", moveErr.message);
    return NextResponse.json<ApiErrorResponse>(
      { error: "기술 상세 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // ── Step 5: typeId → 한국어 타입명 맵 조회 ───────────────────
  const typeIds = [
    ...new Set(
      ((moveDetails ?? []) as MoveDetailRow[])
        .map((m) => m.typeId)
        .filter((id): id is number => id != null)
    ),
  ];
  const typeMap = await fetchTypeMap(typeIds);

  // ── 응답 조립 ────────────────────────────────────────────────
  const moveDetailMap = new Map<number, MoveDetailRow>(
    ((moveDetails ?? []) as MoveDetailRow[]).map((m) => [m.id, m])
  );

  const result: PokemonMovesResponse = moveIds
    .map((moveId): PokemonMoveItem | null => {
      const m = moveDetailMap.get(moveId);
      if (!m) return null;

      return {
        moveId: m.id,
        koreanName: m.koreanName ?? m.id.toString(),
        korType: m.typeId != null ? (typeMap.get(m.typeId) ?? "???") : "???",
        power: m.power,
        accuracy: m.accuracy,
        pp: m.pp,
        damageClass: m.damageClass ?? "status",
        korDescription: m.korDescription,
        learnMethods: learnMap.get(moveId) ?? [],
      };
    })
    .filter((item): item is PokemonMoveItem => item !== null)
    // 레벨업 기준 정렬, 그 외는 뒤로
    .sort((a, b) => {
      const aLevel = a.learnMethods.find((l) => l.learnMethod === "level-up")?.levelLearnedAt ?? 999;
      const bLevel = b.learnMethods.find((l) => l.learnMethod === "level-up")?.levelLearnedAt ?? 999;
      return aLevel - bLevel;
    });

  return NextResponse.json<PokemonMovesResponse>(result);
}
