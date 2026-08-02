"use client";

import {useMemo} from "react";
import {Loader} from "@/components/common-ui/Loader/Loader";
import ScrollToTopButton from "@/components/common-ui/ScrollToTopButton/ScrollToTopButton";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {useSearchLearningPokemonsQuery} from "@/queries/searchLearningPokemonsQueries";
import {useBottomSheetDrag} from "@/hooks/useBottomSheetDrag";
import {useInfiniteScrollSentinel} from "@/hooks/useInfiniteScrollSentinel";
import {useLearningMoveNames} from "@/hooks/useLearningMoveNames";
import {useScrollTopButton} from "@/hooks/useScrollTopButton";

import LearningPokemonsHeader from "./LearningPokemonsHeader/LearningPokemonsHeader";
import LearningPokemonsResults from "./LearningPokemonsResults/LearningPokemonsResults";

// 바텀시트 닫힘 상태에서 화면 하단에 남겨둘 손잡이 영역 높이(px)
// (아래 className의 h-12 / translate-y-[calc(85vh_-_48px)] 값과 반드시 일치해야 함)
const SHEET_HANDLE_PEEK_PX = 48;

/**
 * 배우는 포켓몬 결과 영역
 *
 * 데스크톱에서는 우측 정적 패널, 모바일에서는 끌어 여닫는 바텀시트로 동작함
 * 이 파일은 조립만 하고, 실제 동작은 아래로 나눠져 있음
 *  - 시트 드래그/스크롤 전파 차단 : `useBottomSheetDrag`
 *  - 맨 위로 버튼 상태           : `useScrollTopButton`
 *  - 기술 이름 조회·조립         : `useLearningMoveNames`
 *  - 헤더 / 본문                 : `LearningPokemonsHeader`, `LearningPokemonsResults`
 */
function LearningPokemonsSection() {
  const {
    sortKey,
    sortDirection,
    versionName,
    learnMethods,
    committedMoveIds,
    hasSearched,
    isBelowMd,
    isBottomSheetOpen,
    setBottomSheetOpen,
  } = useLearningSearchContext();

  const {data, isLoading, isFetching, isError, fetchNextPage, hasNextPage, isFetchingNextPage} =
    useSearchLearningPokemonsQuery({
      moveIds: committedMoveIds,
      versionName,
      sortKey,
      sortDirection,
      learnMethods,
    });

  // 지금까지 불러온 모든 페이지를 이어붙인 목록
  const allLearningPokemons = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  // 헤더에 표시할 마릿수는 "불러온 개수"가 아니라 조건을 만족하는 "전체 마릿수"임
  // 모든 페이지가 같은 값을 담고 있으므로 첫 페이지에서 읽으면 됨
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const resultCount = hasSearched && data ? totalCount : null;

  // 감지 요소가 화면에 들어오면 다음 24개를 불러옴
  // 마지막 페이지에서는 감지 요소가 계속 보이는 채로 남으므로 hasNextPage 가드가 필수임
  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>(fetchNextPage, hasNextPage && !isFetchingNextPage);

  const {moveNamesForChips, moveNamesForCards} = useLearningMoveNames(committedMoveIds, allLearningPokemons);

  /**
   * 검색 조건을 문자열 하나로 압축한 값 — 바뀌면 목록을 맨 위부터 다시 보게 함
   *
   * 배열(moveIds/learnMethods)은 매 렌더 새 참조라 의존성 배열에 그대로 넣으면 매번 실행됨
   * 정렬해서 담는 이유는 원소 순서만 다른 같은 조건을 같은 값으로 보기 위함임
   */
  const searchConditionKey = JSON.stringify({
    moveIds: [...committedMoveIds].sort((a, b) => a - b),
    versionName,
    sortKey,
    sortDirection,
    learnMethods: [...learnMethods].sort(),
  });

  const {scrollAreaRef, isScrolledDown, scrollToTop} = useScrollTopButton<HTMLDivElement>({
    resetKey: searchConditionKey,
  });

  const {sheetRef, sheetStyle, dragHandleProps, sheetDragProps} = useBottomSheetDrag({
    enabled: isBelowMd,
    isOpen: isBottomSheetOpen,
    setOpen: setBottomSheetOpen,
    peekPx: SHEET_HANDLE_PEEK_PX,
  });

  // 결과 그리드가 실제로 그려지는 상태인지 여부 (LearningPokemonsResults의 마지막 분기와 같은 조건)
  // 맨 위로 버튼은 스크롤할 목록이 있을 때만 띄움 —
  // 안내 문구만 있는 화면에서는 눌러도 아무 일이 없는 죽은 버튼이 됨
  const isShowingResults =
    learnMethods.length > 0 && hasSearched && !isLoading && !isError && allLearningPokemons.length > 0;

  return (
    <div
      ref={sheetRef}
      style={sheetStyle}
      className="relative flex-1 shrink-0 min-w-0 w-full md:w-auto md:h-full
        max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[85vh] max-md:shadow-2xl
        max-md:rounded-t-4xl max-md:border-t max-md:border-slate-700 max-md:bg-background
        max-md:translate-y-[calc(85vh-48px)] max-md:transition-[translate] max-md:duration-300"
    >
      {/* 드래그 손잡이 (모바일 전용) */}
      <div
        {...dragHandleProps}
        className="hidden max-md:flex h-12 shrink-0 items-center justify-center
          touch-none select-none cursor-grab active:cursor-grabbing w-full"
      >
        <div className="w-[30%] h-1.5 rounded-full bg-slate-600" />
      </div>

      {/* 세로 배치: 헤더는 상단 고정, 결과 목록만 스크롤됨 */}
      <div className="h-full max-md:h-[calc(100%_-_48px)] w-full flex flex-col">
        <LearningPokemonsHeader
          resultCount={resultCount}
          moveNames={moveNamesForChips}
          dragProps={sheetDragProps}
          isDraggable={isBelowMd}
        />

        {/* 본문 — 스크롤은 여기서만 일어남
            min-h-0이 없으면 flex 자식이 내용 높이만큼 늘어나 스크롤이 바깥으로 새어 나감 */}
        <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto md:px-8 md:pb-8 px-5 pb-5">
          <LearningPokemonsResults
            pokemons={allLearningPokemons}
            moveNames={moveNamesForCards}
            hasLearnMethods={learnMethods.length > 0}
            hasSearched={hasSearched}
            isLoading={isLoading}
            isError={isError}
            isFetchingNextPage={isFetchingNextPage}
            sentinelRef={sentinelRef}
          />
        </div>
      </div>

      {/* 맨 위로 — 스크롤 컨테이너 "바깥"에 두어야 함께 밀려 올라가지 않음
          위치 기준은 이 섹션 루트(relative)이고, 그 우측 하단이 곧 스크롤 영역의 우측 하단임 */}
      {isShowingResults && (
        <ScrollToTopButton visible={isScrolledDown} onClick={scrollToTop} className="absolute bottom-6 right-6 z-20" />
      )}

      {/* 검색 요청 중 오버레이 (버튼 클릭·필터·정렬 변경으로 인한 fetch)
          다음 페이지 로딩은 제외함 — 그때는 하단 "데이터를 가져오는 중입니다"가 담당하고,
          여기서 걸러내지 않으면 스크롤할 때마다 목록 전체가 덮임 */}
      {isFetching && !isFetchingNextPage && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50">
          <Loader />
        </div>
      )}
    </div>
  );
}

export default LearningPokemonsSection;
