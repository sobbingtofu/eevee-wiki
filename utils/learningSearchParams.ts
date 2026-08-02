/**
 * 배우는 포켓몬 검색 조건 ↔ URL 검색 파라미터 변환
 *
 * 검색 조건을 URL에 두는 이유:
 *   포켓몬 상세 페이지로 갔다가 뒤로가기로 돌아왔을 때 이전 검색 결과가 그대로 살아 있어야 함
 *   조건이 컴포넌트 state에만 있으면 언마운트와 함께 사라짐
 *   URL에 있으면 조건이 복원되고, 같은 queryKey라 React Query 캐시에서 결과까지 즉시 복원됨
 *
 * 링크 공유·새로고침으로도 같은 결과가 재현됨
 */
import {LEARN_METHOD_FILTERS, POKEMON_SORT_KEYS, SORT_DIRECTIONS} from "@/types/apiTypes";
import type {LearnMethodFilter, PokemonSortKey, SortDirection} from "@/types/apiTypes";

/** URL에 쓰는 파라미터 키 (한 곳에서만 정의해 읽기/쓰기가 어긋나지 않게 함) */
export const LEARNING_SEARCH_PARAM_KEYS = {
  moveIds: "moveIds",
  version: "version",
  sortKey: "sortKey",
  sortDirection: "sortDirection",
  learnMethods: "learnMethods",
} as const;

/** 정렬 기본값 — URL에 값이 없을 때 씀 */
export const DEFAULT_SORT_KEY: PokemonSortKey = "name";
export const DEFAULT_SORT_DIRECTION: SortDirection = "asc";

/** URL에 담기는 검색 조건 전체 */
export interface LearningSearchParams {
  moveIds: number[];
  versionName: string;
  sortKey: PokemonSortKey;
  sortDirection: SortDirection;
  learnMethods: LearnMethodFilter[];
}

/**
 * URL에서 읽어낸 값 — 각 항목은 "URL에 없음"을 undefined로 구분함
 *
 * `learnMethods`의 `undefined`(미지정)와 `[]`(전부 해제)는 뜻이 다름
 * 미지정이면 버전의 기본값으로 채워야 하고, 전부 해제는 사용자가 그렇게 고른 상태임
 */
export interface ParsedLearningSearchParams {
  moveIds: number[] | undefined;
  versionName: string | undefined;
  sortKey: PokemonSortKey | undefined;
  sortDirection: SortDirection | undefined;
  learnMethods: LearnMethodFilter[] | undefined;
}

/** 허용된 값 목록에 있는 것만 통과시킴 (손으로 고친 URL이 그대로 서버까지 가지 않게 함) */
function pickAllowed<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  if (raw === null) return undefined;
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

/** "63,85" → [63, 85]. 양의 정수만 남기고 중복은 제거함 */
function parseIdList(raw: string | null): number[] | undefined {
  if (raw === null) return undefined;
  const ids = raw
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

/** "level-up,machine" → ["level-up", "machine"]. 허용 목록에 없는 값은 버림 */
function parseAllowedList<T extends string>(raw: string | null, allowed: readonly T[]): T[] | undefined {
  if (raw === null) return undefined;
  const values = raw.split(",").filter((value): value is T => allowed.includes(value as T));
  return [...new Set(values)];
}

export function parseLearningSearchParams(searchParams: URLSearchParams): ParsedLearningSearchParams {
  return {
    moveIds: parseIdList(searchParams.get(LEARNING_SEARCH_PARAM_KEYS.moveIds)),
    versionName: searchParams.get(LEARNING_SEARCH_PARAM_KEYS.version) || undefined,
    sortKey: pickAllowed(searchParams.get(LEARNING_SEARCH_PARAM_KEYS.sortKey), POKEMON_SORT_KEYS),
    sortDirection: pickAllowed(searchParams.get(LEARNING_SEARCH_PARAM_KEYS.sortDirection), SORT_DIRECTIONS),
    learnMethods: parseAllowedList(
      searchParams.get(LEARNING_SEARCH_PARAM_KEYS.learnMethods),
      LEARN_METHOD_FILTERS,
    ),
  };
}

/**
 * 검색 조건을 쿼리 문자열로 만듦
 *
 * `learnMethods`는 빈 배열이어도 키를 남김 —
 * 키가 없으면 "미지정"으로 읽혀 버전 기본값이 다시 채워지므로, 전부 해제한 상태를 표현할 수 없음
 */
export function buildLearningSearchQuery(params: LearningSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.moveIds.length > 0) {
    searchParams.set(LEARNING_SEARCH_PARAM_KEYS.moveIds, params.moveIds.join(","));
  }
  if (params.versionName) {
    searchParams.set(LEARNING_SEARCH_PARAM_KEYS.version, params.versionName);
  }
  searchParams.set(LEARNING_SEARCH_PARAM_KEYS.sortKey, params.sortKey);
  searchParams.set(LEARNING_SEARCH_PARAM_KEYS.sortDirection, params.sortDirection);
  searchParams.set(LEARNING_SEARCH_PARAM_KEYS.learnMethods, params.learnMethods.join(","));

  return searchParams.toString();
}
