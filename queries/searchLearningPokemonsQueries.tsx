/**
 * 기술 바구니에 담긴 복수의 기술을 특정 게임 버전에서 모두 배우는 포켓몬 검색
 *
 * 설계: "파라미터 = queryKey" 선언형 useInfiniteQuery
 *  - 검색 조건(moveIds/versionName/sortKey/sortDirection/learnMethods)이 통째로 queryKey가 됨.
 *  - 조건이 바뀌면 자동으로 재요청되고, 같은 조건은 캐시에서 즉시 재사용됨.
 *  - "검색 버튼"은 committedMoveIds를 확정하는 역할만 하고(→ enabled true), refetch 수동 호출 불필요.
 *
 * page는 queryKey에 넣지 않는다:
 *  pageParam으로 관리되어 같은 검색 조건의 모든 페이지가 하나의 캐시 엔트리에 누적된다.
 *  덕분에 정렬/필터를 바꿨다가 되돌리면 이미 읽은 페이지까지 그대로 복원된다.
 *  반대로 조건이 바뀌면 queryKey가 달라져 자동으로 1페이지부터 다시 시작한다
 *  (별도 리셋 코드가 필요 없다).
 *
 * enabled 조건:
 *  - moveIds 1개 이상 (검색 대상 기술이 확정됨)
 *  - learnMethods 1개 이상 (아무것도 선택 안 하면 요청하지 않음 → UI에서 가이드 표시)
 *  - versionName 존재 (버전 목록 로딩 전에는 요청하지 않음)
 */

import {keepPreviousData, useInfiniteQuery} from "@tanstack/react-query";
import type {
  ApiErrorResponse,
  SearchLearningPokemonsRequest,
  SearchLearningPokemonsResponse,
} from "@/types/apiTypes";

/** 검색 조건 — page는 훅이 pageParam으로 채우므로 호출부가 넘기지 않는다 */
export type SearchLearningPokemonsParams = Omit<SearchLearningPokemonsRequest, "page">;

export const SEARCH_LEARNING_POKEMONS_QUERY_KEY = "search-learning-pokemons";

/**
 * 검색 조건 → 결정론적 queryKey
 * - 배열(moveIds, learnMethods)은 정렬해서 원소 순서가 달라도 같은 캐시를 공유하도록 함
 *   (예: [7,9] 와 [9,7] 은 동일 검색)
 */
function buildSearchQueryKey(params: SearchLearningPokemonsParams) {
  return [
    SEARCH_LEARNING_POKEMONS_QUERY_KEY,
    {
      moveIds: [...params.moveIds].sort((a, b) => a - b),
      versionName: params.versionName,
      sortKey: params.sortKey,
      sortDirection: params.sortDirection,
      learnMethods: [...params.learnMethods].sort(),
    },
  ] as const;
}

async function postSearchLearningPokemons(
  params: SearchLearningPokemonsParams,
  page: number,
): Promise<SearchLearningPokemonsResponse> {
  const res = await fetch(`/api/search-learning-pokemons`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({...params, page} satisfies SearchLearningPokemonsRequest),
  });

  if (!res.ok) {
    const errBody: ApiErrorResponse = await res.json().catch(() => ({error: `HTTP ${res.status}`}));
    throw new Error(errBody.error);
  }

  return res.json() as Promise<SearchLearningPokemonsResponse>;
}

/**
 * @example
 * const {data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage} =
 *   useSearchLearningPokemonsQuery({
 *     moveIds: [7, 9], versionName: "scarlet-violet", sortKey: "name", sortDirection: "asc",
 *     learnMethods: ["level-up", "machine", "tutor"],
 *   });
 *
 * // 화면에 그릴 목록 / 전체 마릿수
 * const pokemons = data?.pages.flatMap((p) => p.items) ?? [];
 * const totalCount = data?.pages[0]?.totalCount ?? 0;
 *
 * @example
 * // champions는 배우는 방법이 "train" 하나뿐이다.
 * // 버전에 없는 방법만 넘기면 서버가 빈 페이지를 돌려준다 (에러 아님).
 * useSearchLearningPokemonsQuery({
 *   moveIds: [7], versionName: "champions", sortKey: "name", sortDirection: "asc",
 *   learnMethods: ["train"],
 * });
 */
export function useSearchLearningPokemonsQuery(params: SearchLearningPokemonsParams) {
  const enabled = params.moveIds.length > 0 && params.learnMethods.length > 0 && params.versionName.length > 0;

  return useInfiniteQuery({
    queryKey: buildSearchQueryKey(params),
    queryFn: ({pageParam}) => postSearchLearningPokemons(params, pageParam),
    initialPageParam: 0,
    // hasNextPage가 false면 undefined를 돌려주고, React Query는 그때부터
    // hasNextPage를 false로 보고 fetchNextPage() 호출을 무시한다.
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    enabled,
    // 정렬/필터 변경으로 재요청될 때 이전 결과를 유지해 깜빡임 방지
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
}
