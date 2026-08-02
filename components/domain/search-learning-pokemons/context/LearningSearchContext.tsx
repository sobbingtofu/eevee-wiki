"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useMediaQuery} from "@/hooks/useMediaQuery";
import {useVersions} from "@/queries/versionQueries";
import {
  buildLearningSearchQuery,
  parseLearningSearchParams,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_KEY,
  type LearningSearchParams,
} from "@/utils/learningSearchParams";
import type {LearnMethodFilter, PokemonSortKey, SortDirection} from "@/types/apiTypes";

/**
 * 배우는 포켓몬 검색 페이지 내에서 공유되는 검색 조건
 *
 * **검색 조건의 원본은 URL 검색 파라미터임.** 이 컨텍스트는 URL을 읽어 해석해 주고,
 * 조건을 바꾸는 함수들은 state가 아니라 URL을 갱신함
 * 덕분에 포켓몬 상세 페이지로 갔다가 뒤로가기로 돌아와도 조건이 그대로 살아 있고,
 * 같은 queryKey라 React Query 캐시에서 결과까지 즉시 복원됨
 *
 * - 라이브 컨트롤(sortKey/sortDirection/versionName/learnMethods): 바꾸는 즉시 URL을 replace 하고 재검색됨
 *   (replace라 드롭다운을 여러 번 만져도 히스토리가 쌓이지 않음)
 * - committedMoveIds: "검색" 버튼을 눌렀을 때만 push 로 확정됨
 *   (버킷은 staging이고, URL에 실린 moveIds만 실제 쿼리 대상)
 * - bottom sheet: md 미만 뷰포트용 UI 상태라 URL에 담지 않음
 */
interface LearningSearchContextValue {
  sortKey: PokemonSortKey;
  sortDirection: SortDirection;
  /** 검색 대상 게임 버전. 버전 목록 로딩 전에는 빈 문자열 */
  versionName: string;
  learnMethods: LearnMethodFilter[];
  /**
   * 현재 버전에서 실제로 쓸 수 있는 배우는 방법
   * 버전마다 다름 — champions는 "트레이닝"뿐이고, 레전드 아르세우스에는 기술머신이 없음
   */
  availableLearnMethods: LearnMethodFilter[];
  setSortKey: (key: PokemonSortKey) => void;
  setSortDirection: (direction: SortDirection) => void;
  setVersionName: (versionName: string) => void;
  toggleLearnMethod: (method: LearnMethodFilter) => void;

  committedMoveIds: number[];
  /** 검색이 확정된 적이 있는지 (검색 전 안내 표시 판별용) — URL에 moveIds가 있는지와 같음 */
  hasSearched: boolean;
  commitSearch: (moveIds: number[]) => void;

  /** 뷰포트가 tailwind md 미만인지 여부 */
  isBelowMd: boolean;

  /** 바텀시트 열림 여부 (md 미만에서만 시각적으로 의미 있음) */
  isBottomSheetOpen: boolean;

  openBottomSheet: () => void;
  setBottomSheetOpen: (open: boolean) => void;
}

const LearningSearchContext = createContext<LearningSearchContextValue | null>(null);

/**
 * 검색 조건을 URL에서 읽어 제공하는 컨텍스트
 *
 * `useSearchParams`를 쓰므로 상위에 Suspense 경계가 필요함
 */
export function LearningSearchProvider({children}: {children: ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 버전 목록은 세션당 한 번만 받음 (staleTime: Infinity)
  const {data: versions = []} = useVersions();

  const parsed = useMemo(() => parseLearningSearchParams(searchParams), [searchParams]);

  /**
   * URL에 버전이 없을 때 쓸 기본 버전
   *
   * 배열 첫 원소가 아니라 displayOrder 최댓값을 씀
   * 목록은 "표시 순서"라 세대에 묶이지 않는 단독 타이틀(포켓몬 챔피언스)이 맨 앞에 오지만,
   * 초기 선택은 여전히 스칼렛·바이올렛이어야 하기 때문임
   * → 기본 버전을 바꾸려면 TB_GEN_INFO.displayOrder만 조정하면 됨 (코드 수정 불필요)
   */
  const defaultVersionName = useMemo(() => {
    if (versions.length === 0) return "";
    return versions.reduce((max, v) => (v.displayOrder > max.displayOrder ? v : max)).versionName;
  }, [versions]);

  const versionName = parsed.versionName ?? defaultVersionName;

  const availableLearnMethods = useMemo(
    () => versions.find((v) => v.versionName === versionName)?.learnMethods ?? [],
    [versions, versionName],
  );

  // URL에 지정이 없으면 그 버전에서 가능한 방법 전부 (별도 해제 전까지 바로 검색 가능)
  const learnMethods = parsed.learnMethods ?? availableLearnMethods;
  const sortKey = parsed.sortKey ?? DEFAULT_SORT_KEY;
  const sortDirection = parsed.sortDirection ?? DEFAULT_SORT_DIRECTION;

  const committedMoveIds = useMemo(() => parsed.moveIds ?? [], [parsed.moveIds]);
  const hasSearched = committedMoveIds.length > 0;

  /** 지금 URL이 뜻하는 조건 전체 — 일부만 바꿔 쓸 때의 바탕이 됨 */
  const currentParams = useMemo<LearningSearchParams>(
    () => ({moveIds: committedMoveIds, versionName, sortKey, sortDirection, learnMethods}),
    [committedMoveIds, versionName, sortKey, sortDirection, learnMethods],
  );

  /**
   * 조건 일부를 바꿔 URL을 갱신함
   *
   * @param mode "replace"는 히스토리를 쌓지 않음 — 정렬/필터를 여러 번 만져도
   *             뒤로가기 한 번이면 이 페이지를 벗어나게 하기 위함임
   *             "push"는 검색 버튼처럼 "새 검색"으로 볼 동작에만 씀
   */
  const updateSearchParams = useCallback(
    (changes: Partial<LearningSearchParams>, mode: "push" | "replace") => {
      const query = buildLearningSearchQuery({...currentParams, ...changes});
      const url = `${pathname}?${query}`;
      // scroll: false — 조건만 바뀌는 것이라 페이지를 맨 위로 튕기지 않음
      if (mode === "push") router.push(url, {scroll: false});
      else router.replace(url, {scroll: false});
    },
    [currentParams, pathname, router],
  );

  const setSortKey = useCallback(
    (key: PokemonSortKey) => updateSearchParams({sortKey: key}, "replace"),
    [updateSearchParams],
  );

  const setSortDirection = useCallback(
    (direction: SortDirection) => updateSearchParams({sortDirection: direction}, "replace"),
    [updateSearchParams],
  );

  /**
   * 버전을 바꾸면 배우는 방법 선택을 새 버전의 가용 목록으로 초기화함
   *
   * 그러지 않으면 이전 버전에만 있던 선택이 남아 반드시 0건이 되는 상태가 만들어짐
   * (스칼렛·바이올렛의 "기술머신"을 켠 채 champions로 옮기는 경우)
   */
  const setVersionName = useCallback(
    (next: string) => {
      const nextMethods = versions.find((v) => v.versionName === next)?.learnMethods ?? [];
      updateSearchParams({versionName: next, learnMethods: [...nextMethods]}, "replace");
    },
    [versions, updateSearchParams],
  );

  const toggleLearnMethod = useCallback(
    (method: LearnMethodFilter) => {
      const next = learnMethods.includes(method)
        ? learnMethods.filter((m) => m !== method)
        : [...learnMethods, method];
      updateSearchParams({learnMethods: next}, "replace");
    },
    [learnMethods, updateSearchParams],
  );

  // 검색 버튼만 히스토리를 쌓음 — 뒤로가기로 이전 검색으로 돌아갈 수 있게 하기 위함임
  const commitSearch = useCallback(
    (moveIds: number[]) => updateSearchParams({moveIds}, "push"),
    [updateSearchParams],
  );

  // ── 모바일 bottom sheet UI 상태 (URL에 담지 않음) ─────────
  const isBelowMd = useMediaQuery("(max-width: 767.98px)");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const openBottomSheet = useCallback(() => setIsBottomSheetOpen(true), []);
  const setBottomSheetOpen = useCallback((open: boolean) => setIsBottomSheetOpen(open), []);

  // md 브레이크포인트를 오갈 때(isBelowMd 값이 바뀔 때)마다 바텀시트를 항상 닫힘 처리함
  // (effect 내 setState 대신, 이전 값과 비교해 렌더 중 조정하는 React 권장 패턴)
  const [prevIsBelowMd, setPrevIsBelowMd] = useState(isBelowMd);

  if (prevIsBelowMd !== isBelowMd) {
    setPrevIsBelowMd(isBelowMd);
    setIsBottomSheetOpen(false);
  }

  const contextValues = useMemo(
    () => ({
      sortKey,
      sortDirection,
      versionName,
      learnMethods,
      availableLearnMethods,
      setSortKey,
      setSortDirection,
      setVersionName,
      toggleLearnMethod,
      committedMoveIds,
      hasSearched,
      commitSearch,
      isBelowMd,
      isBottomSheetOpen,
      openBottomSheet,
      setBottomSheetOpen,
    }),
    [
      sortKey,
      sortDirection,
      versionName,
      learnMethods,
      availableLearnMethods,
      setSortKey,
      setSortDirection,
      setVersionName,
      toggleLearnMethod,
      committedMoveIds,
      hasSearched,
      commitSearch,
      isBelowMd,
      isBottomSheetOpen,
      openBottomSheet,
      setBottomSheetOpen,
    ],
  );

  return <LearningSearchContext.Provider value={contextValues}>{children}</LearningSearchContext.Provider>;
}

export function useLearningSearchContext() {
  const context = useContext(LearningSearchContext);
  if (!context) {
    throw new Error("useLearningSearchContext must be used within LearningSearchProvider");
  }
  return context;
}
