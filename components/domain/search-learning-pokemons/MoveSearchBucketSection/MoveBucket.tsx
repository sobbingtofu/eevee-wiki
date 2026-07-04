import {useEffect, useRef} from "react";
import {useMoveBucketContext} from "./context/MoveBucketContext";
import {MoveBucketItem} from "./MoveBucketItem";

interface MoveBucketProps {
  className?: string;
}

function MoveBucket({className}: MoveBucketProps) {
  const {moveBucketIds, clearMoveBucketIds} = useMoveBucketContext();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevBucketCountRef = useRef(moveBucketIds.length);

  /**
   * 기술이 새로 추가되어 목록 개수가 늘어났을 때,
   * 새 기술이 화면에 보이도록 스크롤 컨테이너를 맨 아래로 이동
   * (새 기술은 항상 목록의 마지막에 붙기 때문)
   */
  useEffect(() => {
    const isAdded = moveBucketIds.length > prevBucketCountRef.current;
    prevBucketCountRef.current = moveBucketIds.length;

    if (isAdded && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({top: container.scrollHeight, behavior: "smooth"});
    }
  }, [moveBucketIds.length]);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between pl-1 pr-1.5">
        <h3 className="text-xs font-bold">검색할 기술 ({moveBucketIds.length}개)</h3>
        <button
          type="button"
          onClick={clearMoveBucketIds}
          className="relative text-xs font-bold text-red-600 cursor-pointer after:content-[''] after:absolute
            after:left-0 after:bottom-0 after:h-[1.5px] after:w-0 after:bg-red-600 after:transition-[width]
            after:duration-150 hover:after:w-full"
        >
          전체 삭제
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        className="w-full mt-4 flex flex-col gap-2 max-h-[calc(100%-32px)] overflow-y-auto [scrollbar-gutter:stable]"
      >
        {moveBucketIds.map((moveId) => (
          <div key={moveId}>
            <MoveBucketItem moveId={moveId} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default MoveBucket;
