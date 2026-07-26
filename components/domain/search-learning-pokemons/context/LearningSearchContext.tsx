"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {useMediaQuery} from "@/hooks/useMediaQuery";
import {useVersions} from "@/queries/versionQueries";
import type {LearnMethodFilter, PokemonSortKey, SortDirection} from "@/types/apiTypes";

/**
 * 배우는 포켓몬 검색 페이지 내에서 공유되는 정렬/필터 조건의 상태 타입
 *
 * - 라이브 컨트롤(sortKey/sortDirection/versionName/learnMethods): 이 값들은 queryKey에 포함되므로 드롭다운 내 클릭에 따라 즉시 재검색 발생
 * - committedMoveIds: "검색" 버튼 클릭 시에만 버킷 스냅샷으로 확정.
 *   (버킷은 staging이고, 확정된 moveIds만 실제 쿼리 대상)
 * - bottom sheet: md 미만 뷰포트에서 결과 영역을 바텀시트로 표시하기 위한 UI 상태
 */
interface LearningSearchContextValue {
  sortKey: PokemonSortKey;
  sortDirection: SortDirection;
  /** 검색 대상 게임 버전. 버전 목록 로딩 전에는 빈 문자열 */
  versionName: string;
  learnMethods: LearnMethodFilter[];
  /**
   * 현재 버전에서 실제로 쓸 수 있는 배우는 방법.
   * 버전마다 다르다 — champions는 "트레이닝"뿐이고, 레전드 아르세우스에는 기술머신이 없다.
   */
  availableLearnMethods: LearnMethodFilter[];
  setSortKey: (key: PokemonSortKey) => void;
  setSortDirection: (direction: SortDirection) => void;
  setVersionName: (versionName: string) => void;
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

  // 버전 목록은 세션당 한 번만 받는다 (staleTime: Infinity)
  const {data: versions = []} = useVersions();

  const [versionName, setVersionNameState] = useState("");
  // 기본값: 현재 버전에서 가능한 방법 전부 (별도 해제 전까지 바로 검색 가능)
  const [learnMethods, setLearnMethods] = useState<LearnMethodFilter[]>([]);

  const availableLearnMethods = useMemo(
    () => versions.find((v) => v.versionName === versionName)?.learnMethods ?? [],
    [versions, versionName],
  );

  // 버전 목록이 도착하면 기본 버전을 채운다.
  // API가 displayOrder 내림차순으로 주므로 첫 원소가 곧 기본값이다.
  // (effect 대신 렌더 중 조정 — React 권장 패턴)
  if (versionName === "" && versions.length > 0) {
    setVersionNameState(versions[0].versionName);
    setLearnMethods([...versions[0].learnMethods]);
  }

  /**
   * 버전을 바꾸면 배우는 방법 선택을 새 버전의 가용 목록으로 초기화한다.
   *
   * 그러지 않으면 이전 버전에만 있던 선택이 남아 반드시 0건이 되는 상태가 만들어진다.
   * (스칼렛·바이올렛의 "기술머신"을 켠 채 champions로 옮기는 경우)
   */
  const setVersionName = useCallback(
    (next: string) => {
      setVersionNameState(next);
      setLearnMethods([...(versions.find((v) => v.versionName === next)?.learnMethods ?? [])]);
    },
    [versions],
  );

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
