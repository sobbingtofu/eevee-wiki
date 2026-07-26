"use client";

import {useMemo, useRef, useState, type CSSProperties, type PointerEvent} from "react";
import {Loader} from "@/components/common-ui/Loader/Loader";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {useSearchLearningPokemonsQuery} from "@/queries/searchLearningPokemonsQueries";
import {useClickOutside} from "@/hooks/useClickOutside";

import LearningPokemonCard from "./LearningPokemonCard/LearningPokemonCard";
import SearchControls from "./SearchControls/SearchControls";
import SearchMoveChip from "./SearchMoveChip/SearchMoveChip";

// 바텀시트 닫힘 상태에서 화면 하단에 남겨둘 핸들 영역 높이(px)
// (아래 className의 h-12 / translate-y-[calc(85dvh_-_48px)] 값과 반드시 일치)
const SHEET_HANDLE_PEEK_PX = 48;

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

  const {data, isLoading, isFetching, isError} = useSearchLearningPokemonsQuery({
    moveIds: committedMoveIds,
    versionName,
    sortKey,
    sortDirection,
    learnMethods,
  });

  // 카드에 넘길 기술 id 목록은 응답 데이터 기준(표시 데이터와 항상 일치)
  const moveIdsForCards = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0].moveLearnInfo).map(Number);
  }, [data]);

  // ── 바텀시트 핸들 드래그 ──────────────────────────────────
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{startY: number; base: number; closedPx: number} | null>(null);
  // 드래그 중 실시간 translate(px). null이면 드래그 중이 아님(정지 상태는 클래스/열림 인라인이 지배).
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const height = sheetRef.current?.offsetHeight ?? 0;
    const closedPx = Math.max(height - SHEET_HANDLE_PEEK_PX, 0);
    const base = isBottomSheetOpen ? 0 : closedPx;
    dragStartRef.current = {startY: e.clientY, base, closedPx};
    setDragTranslate(base);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const delta = e.clientY - start.startY; // 아래로 드래그하면 +, 위로 드래그하면 -
    const next = Math.min(Math.max(start.base + delta, 0), start.closedPx);
    setDragTranslate(next);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    // 절반 이상 올라와 있으면 열림, 아니면 닫힘으로 스냅
    const current = dragTranslate ?? start.base;
    setBottomSheetOpen(current < start.closedPx / 2);
    setDragTranslate(null);
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // md 미만 + 바텀시트 열림 상태일 때만, 시트 외부 영역 클릭 시 닫기
  useClickOutside(sheetRef, () => setBottomSheetOpen(false), isBelowMd && isBottomSheetOpen);

  // 모바일에서만 인라인 translate 적용 (데스크톱은 md: 정적 패널, 인라인 없음)
  // 닫힘(비드래그) 상태는 인라인을 주지 않고 max-md 클래스의 translate가 지배 → 최초 렌더 깜빡임 방지
  let sheetStyle: CSSProperties | undefined;
  if (isBelowMd) {
    if (dragTranslate !== null) {
      sheetStyle = {translate: `0px ${dragTranslate}px`, transition: "none"};
    } else if (isBottomSheetOpen) {
      sheetStyle = {translate: "0px 0px"};
    }
  }

  const renderBody = () => {
    // 1) 배우는 방법 미선택 → 가이드 (최우선)
    if (learnMethods.length === 0) {
      return <GuideErrorMsg>배우는 방법 옵션을 하나 이상 선택해주세요</GuideErrorMsg>;
    }
    // 2) 검색 실행 전
    if (!hasSearched) {
      return <GuideErrorMsg>기술을 담고 &apos;배우는 포켓몬 검색&apos; 버튼을 눌러 주세요</GuideErrorMsg>;
    }
    // 3) 최초 로딩 중 (이전 결과 없음) → 본문은 비우고 오버레이 로더가 이를 덮음
    //    ("결과 없음"으로 잘못 떨어지지 않도록 가드만 유지)
    if (isLoading) {
      return null;
    }
    // 4) 에러
    if (isError) {
      return <GuideErrorMsg tone="error">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요</GuideErrorMsg>;
    }
    // 5) 결과 없음
    if (!data || data.length === 0) {
      return <GuideErrorMsg>조건을 모두 만족하는 포켓몬이 없습니다</GuideErrorMsg>;
    }
    // 6) 결과 그리드
    return (
      <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-5">
        {data.map((pokemon) => (
          <LearningPokemonCard key={pokemon.pokemonId} pokemon={pokemon} moveIds={moveIdsForCards} />
        ))}
      </div>
    );
  };

  const resultCount = hasSearched && data ? data.length : null;

  return (
    <div
      ref={sheetRef}
      style={sheetStyle}
      className="relative flex-1 shrink-0 min-w-0 w-full md:w-auto md:h-full
        max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[85vh] max-md:shadow-2xl
        max-md:rounded-t-4xl max-md:border-t max-md:border-slate-700 max-md:bg-background
        max-md:translate-y-[calc(85vh-48px)] max-md:transition-[translate] max-md:duration-300"
    >
      {/* 드래그 핸들 (모바일 전용) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => setBottomSheetOpen(!isBottomSheetOpen)}
        className="hidden max-md:flex h-12 shrink-0 items-center justify-center
          touch-none select-none cursor-grab active:cursor-grabbing w-full"
      >
        <div className="w-[30%] h-1.5 rounded-full bg-slate-600" />
      </div>

      <div className="h-full max-md:h-[calc(100%_-_48px)] overflow-y-auto md:p-8 md:pt-8 p-5 pt-0 w-full">
        {/* 헤더 (항상 표시) */}
        <div className="w-full flex items-start justify-between mb-8 xl:flex-row flex-col xl:gap-0 gap-5">
          <div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100">
              배우는 포켓몬 {resultCount !== null && <span className="text-primary1">{resultCount}</span>}
            </h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {committedMoveIds.map((moveId) => (
                <SearchMoveChip key={moveId} moveId={moveId} />
              ))}
            </div>
          </div>

          <SearchControls className="w-full" />
        </div>

        {/* 본문 */}
        {renderBody()}
      </div>

      {/* 검색 요청 중 오버레이 (버튼 클릭·필터·정렬 변경으로 인한 fetch 모두 포함) */}
      {isFetching && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50">
          <Loader />
        </div>
      )}
    </div>
  );
}

export default LearningPokemonsSection;

/** 결과 영역 중앙 안내 메시지 */
function GuideErrorMsg({children, tone = "muted"}: {children: React.ReactNode; tone?: "muted" | "error"}) {
  return (
    <div className="w-full h-full min-h-[240px] flex items-start justify-center">
      <p className={`text-sm mt-[16vh] ${tone === "error" ? "text-red-400" : "text-slate-500"}`}>{children}</p>
    </div>
  );
}
