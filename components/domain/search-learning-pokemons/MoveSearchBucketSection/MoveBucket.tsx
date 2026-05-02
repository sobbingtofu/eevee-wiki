import {DAMAGE_CLASS_MAP} from "@/store/constantStore";
import {useMoveBrief} from "@/queries/moveQueries";

interface MoveBucketProps {
  moveBucketIds: number[];
}

function MoveBucketItem({moveId}: {moveId: number}) {
  const {data: moveBrief, isLoading, isError} = useMoveBrief(moveId);

  if (isLoading) {
    return <p className="text-xs text-gray-500">기술 정보를 불러오는 중...</p>;
  }

  if (isError || !moveBrief) {
    return <p className="text-xs text-red-500">기술 정보를 불러오지 못했습니다. (ID: {moveId})</p>;
  }

  return (
    <div>
      <p>{moveBrief.koreanName}</p>
      <p>{DAMAGE_CLASS_MAP[moveBrief.damageClass]}</p>
      <p>{moveBrief.korType}</p>
    </div>
  );
}

function MoveBucket({moveBucketIds}: MoveBucketProps) {
  return (
    <div>
      {moveBucketIds.map((moveId) => (
        <div key={moveId}>
          <MoveBucketItem moveId={moveId} />
        </div>
      ))}
    </div>
  );
}

export default MoveBucket;
