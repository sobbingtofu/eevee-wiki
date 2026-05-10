import PlainCloseIcon from "@/components/common-ui/CloseIcons/PlainCloseIcon";
import TypeChip from "@/components/common-ui/TypeChip/TypeChip";
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
    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 relative group">
      <button type="button" className="absolute top-[8px] right-[8px] text-slate-500 p-2 cursor-pointer">
        <PlainCloseIcon className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-3 mb-2">
        <TypeChip typeKor={moveBrief.korType} />
        <h3 className="font-bold text-slate-200 text-lg">{moveBrief.koreanName}</h3>
      </div>
      {/* <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{moveBrief.description}</p> */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3 overflow-hidden break-all [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
        {"test".repeat(40)}
      </p>
      <div className="flex gap-4 text-xs font-medium text-slate-400">
        <span>위력: --</span>
        <span>명중: --</span>
        <span>분류: {DAMAGE_CLASS_MAP[moveBrief.damageClass]}</span>
      </div>
    </div>
  );
}
