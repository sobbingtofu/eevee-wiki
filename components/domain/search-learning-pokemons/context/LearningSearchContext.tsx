"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {useMediaQuery} from "@/hooks/useMediaQuery";
import {LEARN_METHOD_FILTERS} from "@/types/apiTypes";
import type {LearnMethodFilter, PokemonSortKey, SortDirection} from "@/types/apiTypes";

/**
 * 배우는 포켓몬 검색 페이지 내에서 공유되는 정렬/필터 조건의 상태 타입
 *
 * - 라이브 컨트롤(sortKey/sortDirection/genNumber/learnMethods): 이 값들은 queryKey에 포함되므로 드롭다운 내 클릭에 따라 즉시 재검색 발생
 * - committedMoveIds: "검색" 버튼 클릭 시에만 버킷 스냅샷으로 확정.
 *   (버킷은 staging이고, 확정된 moveIds만 실제 쿼리 대상)
 * - bottom sheet: md 미만 뷰포트에서 결과 영역을 바텀시트로 표시하기 위한 UI 상태
 */
interface LearningSearchContextValue {
  sortKey: PokemonSortKey;
  sortDirection: SortDirection;
  genNumber: number;
  learnMethods: LearnMethodFilter[];
  setSortKey: (key: PokemonSortKey) => void;
  setSortDirection: (direction: SortDirection) => void;
  setGenNumber: (genNumber: number) => void;
  toggleLearnMethod: (method: LearnMethodFilter) => void;

  committedMoveIds: number[];
  /** 검색 버튼을 한 번이라도 눌렀는지 (검색 전 안내 표시 판별용) */
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
 * 배우는 포켓몬 검색 페이지 내에서 공유되는 정렬/필터 조건의 상태를 제공하는 컨텍스트
 */
export function LearningSearchProvider({children}: {children: ReactNode}) {
  const [sortKey, setSortKey] = useState<PokemonSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [genNumber, setGenNumber] = useState<number>(9);
  // 기본값: 3종 모두 선택 (별도 해제 전까지 바로 검색 가능)
  const [learnMethods, setLearnMethods] = useState<LearnMethodFilter[]>([...LEARN_METHOD_FILTERS]);

  const [committedMoveIds, setCommittedMoveIds] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleLearnMethod = useCallback((method: LearnMethodFilter) => {
    setLearnMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  }, []);

  const commitSearch = useCallback((moveIds: number[]) => {
    setCommittedMoveIds(moveIds);
    setHasSearched(true);
  }, []);

  // ── 모바일 bottom sheet UI 상태 ──────────────────────────
  const isBelowMd = useMediaQuery("(max-width: 767.98px)");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const openBottomSheet = useCallback(() => setIsBottomSheetOpen(true), []);
  const setBottomSheetOpen = useCallback((open: boolean) => setIsBottomSheetOpen(open), []);

  // md 브레이크포인트를 오갈 때(isBelowMd 값이 바뀔 때)마다 바텀시트를 항상 닫힘 처리

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
      genNumber,
      learnMethods,
      setSortKey,
      setSortDirection,
      setGenNumber,
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
      genNumber,
      learnMethods,
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
