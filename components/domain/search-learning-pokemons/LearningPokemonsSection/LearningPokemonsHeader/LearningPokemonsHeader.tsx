import type {ComponentPropsWithoutRef} from "react";
import SearchControls from "../SearchControls/SearchControls";
import SearchMoveChip from "../SearchMoveChip/SearchMoveChip";

interface LearningPokemonsHeaderProps {
  /** 조건을 만족하는 전체 마릿수. 검색 전이면 null이라 숫자를 감춤 */
  resultCount: number | null;
  /** 그릴 순서 그대로의 `moveId → 기술명` (Map이 삽입 순서를 보존하므로 id 배열이 따로 필요 없음) */
  moveNames: Map<number, string>;
  /** 모바일 바텀시트에서 이 영역을 끌어 시트를 여닫을 수 있게 하는 포인터 핸들러들 */
  dragProps?: Pick<
    ComponentPropsWithoutRef<"div">,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
  >;
  /** 끌 수 있는 상태인지 (커서·텍스트 선택 방지 스타일에만 씀) */
  isDraggable?: boolean;
}

/**
 * 결과 영역 상단의 고정 헤더 — 마릿수, 검색한 기술 칩, 정렬/필터 컨트롤
 *
 * 스크롤되지 않으므로 목록을 아무리 내려도 항상 보임
 * 모바일에서는 이 영역 어디를 눌러 끌어도 손잡이와 동일하게 시트가 따라 움직임
 * (드롭다운 버튼 등에서 시작한 입력은 드래그 훅이 걸러냄)
 */
function LearningPokemonsHeader({
  resultCount,
  moveNames,
  dragProps,
  isDraggable = false,
}: LearningPokemonsHeaderProps) {
  return (
    <div
      {...dragProps}
      className={`shrink-0 w-full flex items-start justify-between md:px-8 md:pt-8 px-5 pt-0 sm:pb-8 pb-3
        xl:flex-row flex-col xl:gap-0 gap-3 sm:gap-5
        ${isDraggable ? "select-none cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div>
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-100">
          배우는 포켓몬 {resultCount !== null && <span className="text-primary1">{resultCount}</span>}
        </h2>
        <div className="flex flex-wrap gap-2 sm:mt-3 mt-1.5">
          {[...moveNames].map(([moveId, name]) => (
            <SearchMoveChip key={moveId} name={name} />
          ))}
        </div>
      </div>

      <SearchControls className="w-full" />
    </div>
  );
}

export default LearningPokemonsHeader;
