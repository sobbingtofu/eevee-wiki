/**
 * Supabase 쿼리 공통 헬퍼
 *
 * 여러 API Route에서 반복 사용되는 조회 로직을 분리
 * 모두 server 환경(API Route)에서만 호출됨
 */

import {pokemonTypeKor} from "@/types/pokemonDataType";
import {supabaseServer} from "./server";
import type {LearnMethod, MoveLearnEntry} from "@/types/apiTypes";

// ──────────────────────────────────────────────
// 타입 내부 DB 로우 형태
// ──────────────────────────────────────────────
interface SimplifiedTypeRow {
  id: number;
  koreanName: pokemonTypeKor;
}

interface SimplifiedPokemonTypeRow {
  pokemonId: number;
  typeId: number;
  slot: number;
}

interface SimplifiedLearnRow {
  pokemonId: number;
  moveId: number;
  learnMethod: string;
  levelLearnedAt: number;
  versionName: string;
}

// ──────────────────────────────────────────────
// 헬퍼 함수
// ──────────────────────────────────────────────

/**
 * typeId 배열 → Map<typeId, 한국어 타입명>
 */
export async function fetchTypeMap(typeIds: number[]): Promise<Map<number, pokemonTypeKor>> {
  if (typeIds.length === 0) return new Map();

  const {data, error} = await supabaseServer.from("TB_TYPES").select("id, koreanName").in("id", typeIds);

  if (error || !data) return new Map();
  return new Map((data as SimplifiedTypeRow[]).map((t) => [t.id, t.koreanName]));
}

/**
 * 포켓몬 ID 배열 → Map<pokemonId, 한국어 타입명 배열>
 * 순서: slot 오름차순 (1=주타입, 2=부타입)
 */
export async function fetchPokemonTypesMap(pokemonIds: number[]): Promise<Map<number, string[]>> {
  if (pokemonIds.length === 0) return new Map();

  const {data: ptData, error: ptErr} = await supabaseServer
    .from("TB_CXN_POKEMON_TYPES")
    .select("pokemonId, typeId, slot")
    .in("pokemonId", pokemonIds)
    .order("slot");

  if (ptErr || !ptData || ptData.length === 0) return new Map();

  const typeIds = [...new Set((ptData as SimplifiedPokemonTypeRow[]).map((r) => r.typeId))];
  const typeMap = await fetchTypeMap(typeIds);

  const result = new Map<number, string[]>();
  for (const row of ptData as SimplifiedPokemonTypeRow[]) {
    const existing = result.get(row.pokemonId) ?? [];
    existing.push(typeMap.get(row.typeId) ?? "???");
    result.set(row.pokemonId, existing);
  }
  return result;
}

/**
 * genNumber → 해당 세대의 versionName 배열
 */
export async function fetchGenVersionNames(genNumber: number): Promise<string[]> {
  const {data, error} = await supabaseServer.from("TB_GEN_INFO").select("versionName").eq("genNumber", genNumber);

  if (error || !data) return [];
  return (data as {versionName: string}[]).map((r) => r.versionName);
}

/**
 * (pokemonIds × moveIds × versionNames) 에 해당하는
 * TB_CXN_POKEMON_MOVES 행을 조회하여
 * Map<pokemonId, Map<moveId, MoveLearnEntry[]>> 형태로 반환.
 *
 * - 동일 (learnMethod, levelLearnedAt) 조합이 여러 버전에 걸쳐 중복되는 경우 dedup.
 * - 중복 판단 기준: learnMethod + levelLearnedAt 조합의 동일성.
 *   버전명은 가장 먼저 발견된 값을 사용.
 */
export async function fetchLearnInfoMap(
  pokemonIds: number[],
  moveIds: number[],
  versionNames: string[],
): Promise<Map<number, Map<number, MoveLearnEntry[]>>> {
  if (pokemonIds.length === 0 || moveIds.length === 0 || versionNames.length === 0) {
    return new Map();
  }

  const {data, error} = await supabaseServer
    .from("TB_CXN_POKEMON_MOVES")
    .select("pokemonId, moveId, learnMethod, levelLearnedAt, versionName")
    .in("pokemonId", pokemonIds)
    .in("moveId", moveIds)
    .in("versionName", versionNames);

  if (error || !data) return new Map();

  // Map<pokemonId, Map<moveId, Set<"learnMethod|level"> → MoveLearnEntry>>
  const result = new Map<number, Map<number, MoveLearnEntry[]>>();

  for (const row of data as SimplifiedLearnRow[]) {
    if (!result.has(row.pokemonId)) {
      result.set(row.pokemonId, new Map());
    }
    const moveMap = result.get(row.pokemonId)!;

    if (!moveMap.has(row.moveId)) {
      moveMap.set(row.moveId, []);
    }
    const entries = moveMap.get(row.moveId)!;

    // learnMethod + levelLearnedAt 조합으로 dedup
    const key = `${row.learnMethod}|${row.levelLearnedAt}`;
    const alreadyExists = entries.some((e) => `${e.learnMethod}|${e.levelLearnedAt}` === key);
    if (!alreadyExists) {
      entries.push({
        learnMethod: row.learnMethod as LearnMethod,
        levelLearnedAt: row.levelLearnedAt,
        versionName: row.versionName,
      });
    }
  }

  return result;
}
