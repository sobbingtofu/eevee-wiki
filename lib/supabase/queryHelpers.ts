/**
 * Supabase 쿼리 공통 헬퍼
 *
 * 여러 API Route에서 반복 사용되는 조회 로직을 분리
 * 모두 server 환경(API Route)에서만 호출됨
 */

import {pokemonTypeKor} from "@/types/pokemonDataType";
import {supabaseServer} from "./server";
import type {LearnMethod, LearnMethodFilter, MoveLearnEntry, VersionInfo} from "@/types/apiTypes";

// ──────────────────────────────────────────────
// 타입 내부 DB 로우 형태
// ──────────────────────────────────────────────
interface SimplifiedTypeRow {
  id: number;
  korName: pokemonTypeKor;
}

/** TB_GEN_INFO 로우 (DB는 korName, API 응답은 koreanName으로 내보낸다) */
interface GenInfoRow {
  versionName: string;
  korName: string;
  genNumber: number;
  groupLabel: string | null;
  displayOrder: number;
  learnMethods: LearnMethodFilter[];
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
 * 타입 표 전체의 프로세스 내 캐시.
 *
 * TB_TYPES는 18행짜리 사실상 불변 테이블인데도 기술 조회 경로마다
 * 왕복이 한 번 더 붙고 있었다 (brief·detail·search 모두 "본문 조회 → 타입 조회" 순차 2회).
 * 한 번 받아두면 그 왕복이 통째로 사라진다.
 *
 * in-flight promise를 함께 들고 있어, 동시 요청이 몰려도 조회는 한 번만 나간다.
 */
let typeMapCache: Map<number, pokemonTypeKor> | null = null;
let typeMapInFlight: Promise<Map<number, pokemonTypeKor>> | null = null;

async function loadTypeMap(): Promise<Map<number, pokemonTypeKor>> {
  if (typeMapCache) return typeMapCache;
  if (typeMapInFlight) return typeMapInFlight;

  typeMapInFlight = (async () => {
    const {data, error} = await supabaseServer.from("TB_TYPES").select("id, korName");
    if (error || !data) {
      console.error("[queryHelpers] 타입 목록 조회 오류:", error?.message);
      return new Map<number, pokemonTypeKor>(); // 캐시하지 않음 → 다음 요청에서 재시도
    }
    typeMapCache = new Map((data as SimplifiedTypeRow[]).map((t) => [t.id, t.korName]));
    return typeMapCache;
  })();

  try {
    return await typeMapInFlight;
  } finally {
    typeMapInFlight = null;
  }
}

/**
 * typeId 배열 → Map<typeId, 한국어 타입명>
 *
 * 전체 타입 표가 캐시돼 있으므로 대개 네트워크 왕복 없이 반환된다.
 */
export async function fetchTypeMap(typeIds: number[]): Promise<Map<number, pokemonTypeKor>> {
  if (typeIds.length === 0) return new Map();

  const all = await loadTypeMap();
  const result = new Map<number, pokemonTypeKor>();
  for (const id of typeIds) {
    const korName = all.get(id);
    if (korName != null) result.set(id, korName);
  }
  return result;
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

// ──────────────────────────────────────────────
// 버전 목록
// ──────────────────────────────────────────────

/**
 * 노출 대상 버전 목록의 프로세스 내 캐시.
 *
 * TB_GEN_INFO는 PokeAPI 동기화(scripts/sync-pokeapi.mjs) 때만 바뀌므로
 * 매 요청 조회할 이유가 없다. 동기화 후에는 TTL이 지나며 자연히 반영된다.
 */
const VERSION_CACHE_TTL_MS = 5 * 60 * 1000;
let versionCache: {value: VersionInfo[]; expiresAt: number} | null = null;

/**
 * 실제 학습 데이터를 가진 버전 목록 (드롭다운 표시 순서 그대로).
 *
 * `displayOrder IS NOT NULL` 인 행이 곧 "UI에 노출할 버전"이라는 것이
 * TB_GEN_INFO의 규약이다. (Phase 1에서 hasData와 완전히 일치하도록 정비됨)
 *
 * 정렬은 두 단계다:
 *   1. groupLabel이 null인 단독 타이틀(포켓몬 챔피언스)이 먼저 — 어느 세대에도 묶이지 않으므로
 *      세대 그룹 사이에 끼우지 않고 목록 맨 위에 따로 세운다.
 *   2. 그 안에서 displayOrder 내림차순.
 *
 * 정렬을 SQL이 아니라 여기서 하는 이유: PostgREST의 다중 정렬로 이 규칙을 쓰면
 * groupLabel 문자열의 사전순이 세대 순서를 지배해버린다("10세대" < "9세대").
 * 22행짜리 목록이라 JS에서 정리하는 편이 정확하고 싸다.
 */
export async function fetchPlayableVersions(): Promise<VersionInfo[]> {
  if (versionCache && versionCache.expiresAt > Date.now()) {
    return versionCache.value;
  }

  const {data, error} = await supabaseServer
    .from("TB_GEN_INFO")
    .select("versionName, korName, genNumber, groupLabel, displayOrder, learnMethods")
    .not("displayOrder", "is", null)
    .order("displayOrder", {ascending: false});

  if (error || !data) {
    console.error("[queryHelpers] 버전 목록 조회 오류:", error?.message);
    return [];
  }

  // DB 컬럼은 korName, API 응답 필드는 koreanName (프론트엔드 계약)
  const versions: VersionInfo[] = (data as unknown as GenInfoRow[])
    .map((r) => ({
      versionName: r.versionName,
      koreanName: r.korName,
      genNumber: r.genNumber,
      groupLabel: r.groupLabel,
      displayOrder: r.displayOrder,
      learnMethods: r.learnMethods,
    }))
    .sort((a, b) => Number(a.groupLabel != null) - Number(b.groupLabel != null));
  versionCache = {value: versions, expiresAt: Date.now() + VERSION_CACHE_TTL_MS};
  return versions;
}

/**
 * 조회에 사용할 수 있는 버전명인지 검사.
 *
 * 존재하지 않는 버전명은 에러 없이 빈 결과가 되어버리므로
 * (실제로 BDSP 버전명이 바뀌었을 때 이 방식으로 조용히 0건이 됐다)
 * 라우트 진입 시점에 400으로 걸러낸다.
 */
export async function isPlayableVersion(versionName: string): Promise<boolean> {
  const versions = await fetchPlayableVersions();
  return versions.some((v) => v.versionName === versionName);
}

/**
 * 해당 버전에서 실제로 쓸 수 있는 "배우는 방법" 목록.
 * 존재하지 않는 버전이면 빈 배열.
 */
export async function fetchVersionLearnMethods(versionName: string): Promise<LearnMethodFilter[]> {
  const versions = await fetchPlayableVersions();
  return versions.find((v) => v.versionName === versionName)?.learnMethods ?? [];
}

// ──────────────────────────────────────────────
// 학습 정보
// ──────────────────────────────────────────────

/**
 * (pokemonIds × moveIds × 단일 versionName) 에 해당하는
 * TB_CXN_POKEMON_MOVES 행을 조회하여
 * Map<pokemonId, Map<moveId, MoveLearnEntry[]>> 형태로 반환.
 *
 * TB_CXN_POKEMON_MOVES의 PK가 (pokemonId, moveId, versionName, learnMethod)이므로
 * 단일 버전 안에서는 learnMethod가 유일하다 → dedup 불필요.
 * (세대 단위로 여러 버전을 합치던 시절에만 필요했던 로직)
 */
export async function fetchLearnInfoMap(
  pokemonIds: number[],
  moveIds: number[],
  versionName: string,
): Promise<Map<number, Map<number, MoveLearnEntry[]>>> {
  if (pokemonIds.length === 0 || moveIds.length === 0 || !versionName) {
    return new Map();
  }

  const {data, error} = await supabaseServer
    .from("TB_CXN_POKEMON_MOVES")
    .select("pokemonId, moveId, learnMethod, levelLearnedAt, versionName")
    .in("pokemonId", pokemonIds)
    .in("moveId", moveIds)
    .eq("versionName", versionName);

  if (error || !data) return new Map();

  const result = new Map<number, Map<number, MoveLearnEntry[]>>();

  for (const row of data as SimplifiedLearnRow[]) {
    if (!result.has(row.pokemonId)) {
      result.set(row.pokemonId, new Map());
    }
    const moveMap = result.get(row.pokemonId)!;

    if (!moveMap.has(row.moveId)) {
      moveMap.set(row.moveId, []);
    }
    moveMap.get(row.moveId)!.push({
      learnMethod: row.learnMethod as LearnMethod,
      levelLearnedAt: row.levelLearnedAt,
      versionName: row.versionName,
    });
  }

  return result;
}
