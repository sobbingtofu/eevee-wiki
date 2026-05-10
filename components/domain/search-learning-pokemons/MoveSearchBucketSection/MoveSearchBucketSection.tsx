"use client";

import SearchInput from "@/components/common-ui/SearchInput/SearchInput";
import {useState} from "react";
import MoveBucket from "./MoveBucket";
import SearchBtn from "./SearchBtn";

function MoveSearchBucketSection() {
  const [moveBucketIds, setMoveBucketIds] = useState<number[]>([]);

  return (
    <div className="w-full sm:w-[360px] h-full p-6 bg-backgroundLight flex flex-col justify-between items-start">
      <div className="w-full h-full">
        {/* 높이 86px */}
        <div className="w-full border border-red-600">
          <h3 className="text-xs font-bold mb-4">기술 검색</h3>

          <SearchInput
            handleClickDropdownItem={(item) =>
              setMoveBucketIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
            }
          />
        </div>

        <MoveBucket moveBucketIds={moveBucketIds} className="mt-4 max-h-[calc(100%-86px-40px)] overflow-y-auto" />
      </div>

      {/* 높이 40px */}
      <SearchBtn />
    </div>
  );
}

export default MoveSearchBucketSection;
