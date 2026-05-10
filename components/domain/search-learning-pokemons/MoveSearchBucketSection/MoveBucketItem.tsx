import {useMoveBrief} from "@/queries/moveQueries";
import {DAMAGE_CLASS_MAP} from "@/store/constantStore";

export function MoveBucketItem({moveId}: {moveId: number}) {
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
