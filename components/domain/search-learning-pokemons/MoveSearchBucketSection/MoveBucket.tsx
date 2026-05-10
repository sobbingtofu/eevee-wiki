import {MoveBucketItem} from "./MoveBucketItem";

interface MoveBucketProps {
  moveBucketIds: number[];
  className?: string;
}

function MoveBucket({moveBucketIds, className}: MoveBucketProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <h3 className="text-xs font-bold mb-4 ml-1">검색할 기술 ({moveBucketIds.length}개)</h3>
      <div className="w-full flex flex-col gap-2 max-h-[calc(100%-86px-40px-32px)] overflow-y-auto [scrollbar-gutter:stable]">
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
