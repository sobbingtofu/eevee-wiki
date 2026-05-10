"use client";

import SearchInput from "@/components/common-ui/SearchInput/SearchInput";
import {useState} from "react";
import MoveBucket from "./MoveBucket";
import SearchBtn from "./SearchBtn";

function MoveSearchBucketSection() {
  const [moveBucketIds, setMoveBucketIds] = useState<number[]>([]);

  return (
    <div className="w-full sm:w-[360px] h-full p-6 bg-backgroundLight flex flex-col justify-between items-start">
      <div className="w-full h-[calc(100%-52px-16px)]">
        {/* 높이 86px */}
        <div className="w-full h-[86px]">
          <h3 className="text-xs font-bold mb-4 ml-1">기술 검색</h3>

          <SearchInput
            handleClickDropdownItem={(item) =>
              setMoveBucketIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
            }
          />
        </div>

        <MoveBucket moveBucketIds={moveBucketIds} className="mt-10" />
      </div>

      {/* 높이 52px */}
      <SearchBtn className="mt-4" />
    </div>
  );
}

export default MoveSearchBucketSection;
