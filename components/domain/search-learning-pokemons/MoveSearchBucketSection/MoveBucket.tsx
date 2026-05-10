import {MoveBucketItem} from "./MoveBucketItem";

interface MoveBucketProps {
  moveBucketIds: number[];
  className?: string;
}

function MoveBucket({moveBucketIds, className}: MoveBucketProps) {
  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-xs font-bold mb-4 ml-1">검색할 기술 ({moveBucketIds.length}개)</h3>
      {moveBucketIds.map((moveId) => (
        <div key={moveId}>
          <MoveBucketItem moveId={moveId} />
        </div>
      ))}
    </div>
  );
}

export default MoveBucket;
