"use client";

import SearchInput from "@/components/common-ui/SearchInput/SearchInput";
import MoveBucket from "./MoveBucket";
import SearchBtn from "./SearchBtn";
import {MoveBucketProvider, useMoveBucketContext} from "./context/MoveBucketContext";

function MoveSearchBucketSectionContent() {
  const {addMoveBucketId} = useMoveBucketContext();

  return (
    <div className="w-full sm:w-[360px] h-full p-6 bg-backgroundLight flex flex-col justify-between items-start">
      <div className="w-full h-[calc(100%-52px-16px)]">
        {/* 기술 검색 - 높이 86px */}
        <div className="w-full h-[86px]">
          <h3 className="text-xs font-bold mb-4 ml-1">기술 검색</h3>

          <SearchInput handleClickDropdownItem={(item) => addMoveBucketId(item)} />
        </div>
        {/* 배우는 포켓몬을 검색할 기술들 담는 양동이 - 높이 100% */}
        <MoveBucket className="mt-10" />
      </div>

      {/* 검색 버튼 - 높이 52px */}
      <SearchBtn className="mt-4" />
    </div>
  );
}

function MoveSearchBucketSection() {
  return (
    <MoveBucketProvider>
      <MoveSearchBucketSectionContent />
    </MoveBucketProvider>
  );
}

export default MoveSearchBucketSection;
