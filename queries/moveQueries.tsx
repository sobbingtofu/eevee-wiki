/**
 * 기술(Move) 관련 React Query 훅 모음
 *
 *  1. useSearchMoves          —  기술 국문명 검색 드롭다운 : 입력한 검색어를 포함하는 기술 목록 반환 (드롭다운용)
 *  2. useMoveBrief            —  단일 기술 간략 정보 : 기술 바구니 UI 표시용 (id, koreanName, korType, power, accuracy, damageClass)
 *  3. useMoveDetail           —  단일 기술 상세 정보 : 기술 상세 페이지용 (MoveBrief 필드 + korDescription, pp, effectChance, priority)
 *  4. useMoveLearningPokemons —  기술을 버전별로 배우는 포켓몬 목록 : 기술 상세 페이지 하단 섹션
 *
 */

import {keepPreviousData, useQuery, type QueryClient} from "@tanstack/react-query";
import type {
  ApiErrorResponse,
  MoveBrief,
  MoveDetail,
  MoveLearningPokemonsResponse,
  MoveSearchResponse,
} from "@/types/apiTypes";

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
export const MOVE_QUERY_KEYS = {
  search: (q: string) => ["moves", "search", q] as const,
  brief: (id: number) => ["moves", "brief", id] as const,
  detail: (id: number) => ["moves", "detail", id] as const,
  learningPokemons: (id: number, versionName: string) =>
    ["moves", "learning-pokemons", id, versionName] as const,
} as const;

/**
 * koreanName에 검색어를 포함하는 기술 목록 반환 (드롭다운용)
 *
 * - 검색어 1자 이상일 때만 API 요청
 * - keepPreviousData: 새 검색어 로딩 중에도 이전 결과 유지 (깜빡임 방지)
 *
 * @param query 국문 기술명 검색어 (예: "펀치")
 *
 * @example
 * const { data = [], isLoading } = useSearchMoves("펀치");
 * // data → [{ id: 7, koreanName: "불꽃펀치", korType: "불꽃" }, ...]
 */
export function useSearchMoves(query: string) {
  return useQuery<MoveSearchResponse, Error>({
    queryKey: MOVE_QUERY_KEYS.search(query),
    queryFn: () => apiFetch<MoveSearchResponse>(`/api/moves/search?q=${encodeURIComponent(query.trim())}`),
    enabled: query.trim().length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

/**
 * 특정 기술의 간략 정보 반환 (기술 바구니 UI 표시용)
 *
 * @param id 기술 id (null 전달 시 쿼리 비활성화)
 *
 * @example
 * const { data } = useMoveBrief(7);
 * // data → { id: 7, koreanName: "불꽃펀치", korType: "불꽃",
 * //           power: 75, accuracy: 100, damageClass: "physical" }
 */
export function useMoveBrief(id: number | null) {
  return useQuery<MoveBrief, Error>({
    ...moveBriefQueryOptions(id ?? 0),
    enabled: id != null && id > 0,
  });
}

/**
 * brief 조회 설정 — 훅과 prefetch가 같은 것을 쓰도록 한 곳에 둔다.
 * (staleTime이 어긋나면 prefetch해둔 걸 훅이 다시 받아오게 된다)
 */
function moveBriefQueryOptions(id: number) {
  return {
    queryKey: MOVE_QUERY_KEYS.brief(id),
    queryFn: () => apiFetch<MoveBrief>(`/api/moves/${id}/brief`),
    staleTime: 1000 * 60 * 10, // 10분 캐시
  };
}

/**
 * 기술 상세를 미리 받아둔다 (드롭다운에서 후보를 가리켰을 때).
 *
 * 이미 신선한 캐시가 있으면 prefetchQuery가 알아서 아무것도 하지 않으므로,
 * 같은 항목 위를 여러 번 지나가도 요청은 한 번만 나간다.
 */
export function prefetchMoveBrief(queryClient: QueryClient, id: number) {
  if (id <= 0) return;
  void queryClient.prefetchQuery(moveBriefQueryOptions(id));
}

/**
 * 특정 기술의 상세 정보 반환 (기술 상세 페이지용)
 *
 * - MoveBrief 필드 + korDescription, pp, effectChance, priority 포함
 *
 * @param id 기술 id (null 전달 시 쿼리 비활성화)
 *
 * @example
 * const { data } = useMoveDetail(7);
 * // data → { id: 7, koreanName: "불꽃펀치", ...,
 * //           korDescription: "불꽃을 담은 주먹으로...",
 * //           pp: 15, effectChance: 10, priority: 0 }
 */
export function useMoveDetail(id: number | null) {
  return useQuery<MoveDetail, Error>({
    queryKey: MOVE_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => apiFetch<MoveDetail>(`/api/moves/${id}/detail`),
    enabled: id != null && id > 0,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * 특정 기술을 특정 게임 버전에서 배우는 포켓몬 목록 반환
 * (기술 상세 페이지 하단 섹션)
 *
 * @param id          기술 id (null 전달 시 쿼리 비활성화)
 * @param versionName 게임 버전 (useVersions()의 versionName, 빈 문자열이면 비활성화)
 *
 * @example
 * const { data = [] } = useMoveLearningPokemons(7, "scarlet-violet");
 * // data → [
 * //   { pokemonId: 4, koreanName: "파이리", spriteUrl: "...",
 * //     korTypes: ["불꽃"],
 * //     learnMethods: [{ learnMethod: "machine", levelLearnedAt: 0, versionName: "scarlet-violet" }] }
 * // ]
 */
export function useMoveLearningPokemons(id: number | null, versionName: string) {
  return useQuery<MoveLearningPokemonsResponse, Error>({
    queryKey: MOVE_QUERY_KEYS.learningPokemons(id ?? 0, versionName),
    queryFn: () =>
      apiFetch<MoveLearningPokemonsResponse>(
        `/api/moves/${id}/learning-pokemons?version=${encodeURIComponent(versionName)}`,
      ),
    enabled: id != null && id > 0 && versionName.length > 0,
    staleTime: 1000 * 60 * 10,
    placeholderData: [],
  });
}
