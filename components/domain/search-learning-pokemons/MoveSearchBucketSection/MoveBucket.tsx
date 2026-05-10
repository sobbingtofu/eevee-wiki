import {MoveBucketItem} from "./MoveBucketItem";

interface MoveBucketProps {
  moveBucketIds: number[];
  className?: string;
}

function MoveBucket({moveBucketIds, className}: MoveBucketProps) {
  return (
    <div className={`w-full border border-green-600 ${className}`}>
      {moveBucketIds.map((moveId) => (
        <div key={moveId}>
          <MoveBucketItem moveId={moveId} />
        </div>
      ))}
    </div>
  );
}

export default MoveBucket;
