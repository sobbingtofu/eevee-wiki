"use client";

import {useMemo} from "react";
import {Loader} from "@/components/common-ui/Loader/Loader";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {useSearchLearningPokemonsQuery} from "@/queries/searchLearningPokemonsQueries";

import LearningPokemonCard from "./LearningPokemonCard/LearningPokemonCard";
import SearchControls from "./SearchControls/SearchControls";
import SearchMoveChip from "./SearchMoveChip/SearchMoveChip";

function LearningPokemonsSection() {
  const {sortKey, sortDirection, genNumber, learnMethods, committedMoveIds, hasSearched} = useLearningSearchContext();

  const {data, isLoading, isFetching, isError} = useSearchLearningPokemonsQuery({
    moveIds: committedMoveIds,
    genNumber,
    sortKey,
    sortDirection,
    learnMethods,
  });

  // 카드에 넘길 기술 id 목록은 응답 데이터 기준(표시 데이터와 항상 일치)
  const moveIdsForCards = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0].moveLearnInfo).map(Number);
  }, [data]);

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
    <div className="relative flex-1 h-full shrink-0 min-w-0 md:w-auto w-full">
      <div className="h-full overflow-y-auto p-8 w-full">
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
