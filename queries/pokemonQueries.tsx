/**
 * 포켓몬(Pokemon) 관련 React Query 훅 모음
 *
 *  1. useSearchPokemons —    포켓몬 국문명 검색 드롭다운
 *  2. usePokemonDetail  —    단일 포켓몬 상세 정보 (타입, 특성 포함)
 *  3. usePokemonMoves   —    포켓몬의 세대별 기술 목록
 *
 */

import {keepPreviousData, useQuery} from "@tanstack/react-query";
import type {ApiErrorResponse, PokemonDetail, PokemonMovesResponse, PokemonSearchResponse} from "@/types/apiTypes";

/**
 * 공통 fetch 헬퍼 (GET)
 */
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: ApiErrorResponse = await res.json().catch(() => ({error: `HTTP ${res.status}`}));
    throw new Error(body.error);
  }
  return res.json() as Promise<T>;
}

/**
 * 쿼리 키 상수 — 외부에서 캐시 무효화에 활용
 */
export const POKEMON_QUERY_KEYS = {
  search: (q: string) => ["pokemons", "search", q] as const,
  detail: (id: number) => ["pokemons", "detail", id] as const,
  moves: (id: number, gen: number) => ["pokemons", "moves", id, gen] as const,
} as const;

/**
 * koreanName에 검색어를 포함하는 포켓몬 목록 반환 (드롭다운용)
 *
 * - 검색어 1자 이상일 때만 API 요청
 * - keepPreviousData: 새 검색어 로딩 중에도 이전 결과 유지 (깜빡임 방지)
 *
 * @param query 국문 포켓몬명 검색어 (예: "이상해")
 *
 * @example
 * const { data = [], isLoading } = useSearchPokemons("이상해");
 * // data → [
 * //   { pokemonId: 1, koreanName: "이상해씨", korTypes: ["풀","독"], spriteUrl: "..." },
 * //   { pokemonId: 2, koreanName: "이상해풀", korTypes: ["풀","독"], spriteUrl: "..." },
 * // ]
 */
export function useSearchPokemons(query: string) {
  return useQuery<PokemonSearchResponse, Error>({
    queryKey: POKEMON_QUERY_KEYS.search(query),
    queryFn: () => apiFetch<PokemonSearchResponse>(`/api/pokemons/search?q=${encodeURIComponent(query.trim())}`),
    enabled: query.trim().length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

/**
 * 특정 포켓몬의 상세 정보 반환 (포켓몬 상세 페이지 기본 정보)
 *
 * 반환 데이터:
 *  - 기본 정보: pokemonId, koreanName, officialArtworkUrl, spriteUrl
 *  - 진화 체인 URL: evolutionChainUrl (UI에서 별도 파싱 필요)
 *  - 타입: korTypes (slot 순서 배열)
 *  - 스탯: stats, evStats (JSONB → StatEntry[])
 *  - 특성: abilities[] (displayName, displayDescription, isHidden 포함)
 *
 * 기술 목록은 별도 훅 usePokemonMoves로 분리했음을 참고!
 *
 * @param id 포켓몬 id (null 전달 시 쿼리 비활성화)
 *
 * @example
 * const { data } = usePokemonDetail(658);
 * // data → {
 * //   pokemonId: 658, koreanName: "개굴닌자",
 * //   officialArtworkUrl: "...", spriteUrl: "...",
 * //   korTypes: ["물","악"],
 * //   stats: [{ statName: "hp", statValue: 72 }, ...],
 * //   evStats: [{ statName: "speed", evValue: 3 }],
 * //   abilities: [{ displayName: "변환자재", displayDescription: "...", isHidden: false }]
 * //   evolutionChainUrl: "/api/evolution-chains/67"
 * // }
 */
export function usePokemonDetail(id: number | null) {
  return useQuery<PokemonDetail, Error>({
    queryKey: POKEMON_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => apiFetch<PokemonDetail>(`/api/pokemons/${id}`),
    enabled: id != null && id > 0,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}

/**
 * 특정 포켓몬이 특정 세대에서 배울 수 있는 기술 목록 반환
 * (포켓몬 상세 페이지 하단 — 세대 탭 선택 후 표시)
 *
 * 반환 데이터:
 *  - 기술 기본 정보: moveId, koreanName, korType, power, accuracy, pp,
 *                   damageClass, korDescription
 *  - 학습 방법: learnMethods[] (learnMethod, levelLearnedAt, versionName)
 *  - 정렬: 레벨업 기술(levelLearnedAt 오름차순) → 나머지 기술 순
 *
 * @param id        포켓몬 id (null 전달 시 쿼리 비활성화)
 * @param genNumber 세대 번호 1~9
 *
 * @example
 * const { data = [] } = usePokemonMoves(658, 9);
 * // data → [
 * //   { moveId: 9, koreanName: "물대포", korType: "물", power: 40, ...
 * //     learnMethods: [{ learnMethod: "level-up", levelLearnedAt: 5, versionName: "scarlet-violet" }] },
 * //   { moveId: 56, koreanName: "던지기", korType: "노말", power: 50, ...
 * //     learnMethods: [{ learnMethod: "machine", levelLearnedAt: 0, versionName: "scarlet-violet" }] },
 * // ]
 */
export function usePokemonMoves(id: number | null, genNumber: number) {
  return useQuery<PokemonMovesResponse, Error>({
    queryKey: POKEMON_QUERY_KEYS.moves(id ?? 0, genNumber),
    queryFn: () => apiFetch<PokemonMovesResponse>(`/api/pokemons/${id}/moves?gen=${genNumber}`),
    enabled: id != null && id > 0 && genNumber >= 1 && genNumber <= 9,
    staleTime: 1000 * 60 * 10,
    placeholderData: [],
  });
}
