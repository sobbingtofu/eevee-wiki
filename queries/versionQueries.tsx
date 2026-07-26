/**
 * 게임 버전(Version) 관련 React Query 훅
 *
 *  1. useVersions —  기술 학습 정보를 조회할 수 있는 버전 목록 (22개, 드롭다운 표시 순서 그대로)
 *
 * 기술 학습 정보는 세대가 아니라 **버전 단위**로 조회한다.
 * 같은 8세대라도 소드·실드(75) / BDSP(53) / 레전드 아르세우스(10)처럼
 * 배우는 기술 폭이 크게 다르기 때문이다.
 */

import {useQuery} from "@tanstack/react-query";
import type {ApiErrorResponse, VersionsResponse} from "@/types/apiTypes";

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
export const VERSION_QUERY_KEYS = {
  all: ["versions"] as const,
} as const;

/**
 * 조회 가능한 게임 버전 목록 반환 (드롭다운에 그릴 순서 그대로)
 *
 * 배열 순서는 "표시 순서"일 뿐 기본 선택 버전이 아니다.
 * 세대에 묶이지 않는 단독 타이틀이 맨 앞에 오기 때문이며,
 * 초기 선택 버전은 displayOrder가 가장 큰 항목이다.
 *
 * 이 목록은 PokeAPI 동기화(`npm run sync:pokeapi`) 때만 바뀌므로
 * 세션 내내 다시 받을 이유가 없다 → `staleTime: Infinity`
 *
 * @example
 * const {data: versions} = useVersions();
 * // versions → [
 * //   { versionName: "champions", koreanName: "포켓몬 챔피언스", groupLabel: null,
 * //     genNumber: 9, displayOrder: 21, learnMethods: ["train"] },
 * //   { versionName: "scarlet-violet", koreanName: "스칼렛·바이올렛", groupLabel: "9세대",
 * //     genNumber: 9, displayOrder: 22, learnMethods: ["level-up","machine","tutor"] },
 * //   ...
 * // ]
 */
export function useVersions() {
  return useQuery<VersionsResponse, Error>({
    queryKey: VERSION_QUERY_KEYS.all,
    queryFn: () => apiFetch<VersionsResponse>("/api/versions"),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    // 로딩 중에도 배열로 다룰 수 있게 해 호출부의 undefined 분기를 없앤다
    placeholderData: [],
  });
}
