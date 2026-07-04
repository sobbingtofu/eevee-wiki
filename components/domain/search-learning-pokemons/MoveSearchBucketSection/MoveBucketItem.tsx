import PlainCloseIcon from "@/components/common-ui/CloseIcons/PlainCloseIcon";
import {Loader} from "@/components/common-ui/Loader/Loader";
import TypeChip from "@/components/common-ui/TypeChip/TypeChip";
import {useMoveBrief} from "@/queries/moveQueries";
import {DAMAGE_CLASS_MAP} from "@/store/constantStore";
import {useMoveBucketContext} from "./context/MoveBucketContext";

interface MoveBucketItemProps {
  moveId: number;
}

export function MoveBucketItem({moveId}: MoveBucketItemProps) {
  const {removeMoveBucketId, moveBucketPreviews} = useMoveBucketContext();
  const {data: moveBrief, isLoading, isError} = useMoveBrief(moveId);

  const preview = moveBucketPreviews[moveId];

  const handleClickRemoveBtn = () => {
    removeMoveBucketId(moveId);
  };

  if (isLoading) {
    // 드롭다운에서 이미 가져온 기술 명/타입이 있으면 먼저 표시하고, 상세 정보만 로딩 처리
    if (preview) {
      return (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 relative group">
          {/* 타입과 이름 (미리보기) */}
          <div className="flex items-center gap-3 mb-2">
            <TypeChip typeKor={preview.korType} />
            <h3 className="font-bold text-slate-200 text-lg">{preview.koreanName}</h3>
          </div>

          {/* 상세 정보 로딩 안내 */}
          <div className="h-[67px] flex justify-center items-center">
            <Loader sizeType="small" />
          </div>
        </div>
      );
    }

    return (
      <div className="h-[67px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (isError || !moveBrief) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 relative group">
        {/* 닫기버튼 (로드 실패한 항목도 제거 가능하도록) */}
        <button
          type="button"
          className="absolute top-[8px] right-[8px] text-slate-500 p-2 cursor-pointer"
          onClick={handleClickRemoveBtn}
        >
          <PlainCloseIcon className="w-3 h-3" />
        </button>

        <p className="text-xs text-red-500">기술 정보를 불러오지 못했습니다. (ID: {moveId})</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 relative group">
      {/* 닫기버튼 */}
      <button
        type="button"
        className="absolute top-[8px] right-[8px] text-slate-500 p-2 cursor-pointer"
        onClick={handleClickRemoveBtn}
      >
        <PlainCloseIcon className="w-3 h-3" />
      </button>

      {/* 타입과 이름 */}
      <div className="flex items-center gap-3 mb-2">
        <TypeChip typeKor={moveBrief.korType} />
        <h3 className="font-bold text-slate-200 text-lg">{moveBrief.koreanName}</h3>
      </div>

      {/* 기술 설명 */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3 overflow-hidden break-all [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
        {moveBrief.description}
      </p>

      {/* 위력 명중 분류 */}
      <div className="flex gap-4 text-xs font-medium text-slate-400">
        <span>위력: {moveBrief.power ?? "--"}</span>
        <span>명중: {moveBrief.accuracy ?? "--"}</span>
        <span>분류: {DAMAGE_CLASS_MAP[moveBrief.damageClass]}</span>
      </div>
    </div>
  );
}
