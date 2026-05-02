"use client";

import SearchInput, {SampleSearchResultItem} from "@/components/common-ui/SearchInput/SearchInput";
import {useState} from "react";
import MoveBucket from "./MoveBucket";
import SearchBtn from "./SearchBtn";

function MoveSearchBucketSection() {
  const [moveBucket, setMoveBucket] = useState<SampleSearchResultItem[]>([]);

  return (
    <div className="w-full sm:w-[360px] h-full p-6 bg-backgroundLight flex flex-col justify-start items-start">
      <h3 className="text-xs font-bold mb-4">기술 검색</h3>
      <div className="w-full flex gap-4 mb-6 items-center">
        <div className="w-[75%]">
          <SearchInput handleClickDropdownItem={(item) => setMoveBucket((prev) => [...prev, item])} />
        </div>
        <div className="flex-1">
          <SearchBtn />
        </div>
      </div>
      <MoveBucket moveBucket={moveBucket} />
    </div>
  );
}

export default MoveSearchBucketSection;
