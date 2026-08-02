"use client";

import {useCallback} from "react";
import {useQueryClient} from "@tanstack/react-query";
import SearchInput from "@/components/common-ui/SearchInput/SearchInput";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {prefetchMoveBrief} from "@/queries/moveQueries";
import type {MoveSearchItem} from "@/types/apiTypes";
import MoveBucket from "./MoveBucket";
import SearchBtn from "./SearchBtn";
import {MoveBucketProvider, useMoveBucketContext} from "./context/MoveBucketContext";

function MoveSearchBucketSectionContent() {
  const {addMoveBucketId} = useMoveBucketContext();
  const queryClient = useQueryClient();

  /**
   * 후보를 가리키는 순간 상세 정보를 미리 받아둔다.
   *
   * 가리킨 뒤 클릭까지는 보통 수백 ms가 뜨므로, 그 사이에 요청이 끝나
   * 실제로 담을 때는 캐시 적중이 된다.
   * 검색 응답에 상세를 얹지 않고도 대기가 사라지고,
   * 요청은 실제로 가리킨 항목에 대해서만 나간다.
   *
   * 이미 받아둔 기술이면 prefetchQuery가 staleTime을 보고 알아서 건너뛴다.
   */
  const handleFocusMove = useCallback(
    (item: MoveSearchItem) => {
      prefetchMoveBrief(queryClient, item.id);
    },
    [queryClient],
  );

  return (
    <div
      className="w-full md:w-[360px] h-full p-6 bg-backgroundLight md:min-h-auto min-h-[calc(100vh-64px)]
          flex flex-col justify-between items-start"
    >
      <div className="w-full h-[calc(100%-52px-16px)]">
        {/* 기술 검색 - 높이 86px */}
        <div className="w-full h-[86px]">
          <h3 className="text-xs font-bold mb-4 ml-1">기술 검색</h3>

          <SearchInput handleClickDropdownItem={addMoveBucketId} handleFocusDropdownItem={handleFocusMove} />
        </div>
        {/* 배우는 포켓몬을 검색할 기술들 담는 양동이 - 높이 100% */}
        <MoveBucket className="mt-10 h-[calc(100%-86px-40px)]" />
      </div>

      {/* 검색 버튼 - 높이 52px */}
      <SearchBtn className="mt-4 md:mb-0 mb-12" />
    </div>
  );
}

function MoveSearchBucketSection() {
  const {committedMoveIds} = useLearningSearchContext();

  // 뒤로가기로 돌아온 경우 URL에 실려 있던 기술들로 바구니를 채워 둠 (첫 렌더에서만 반영됨)
  return (
    <MoveBucketProvider initialMoveIds={committedMoveIds}>
      <MoveSearchBucketSectionContent />
    </MoveBucketProvider>
  );
}

export default MoveSearchBucketSection;
