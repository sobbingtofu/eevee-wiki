import {useEffect, useRef} from "react";
import TypeChip from "../TypeChip/TypeChip";
import type {MoveSearchItem} from "@/types/apiTypes";

interface SearchResultDropdownProps {
  searchResults: MoveSearchItem[];
  onResultItemClick: (resultItem: MoveSearchItem) => void;
  /**
   * 항목을 가리켰을 때(마우스 호버) 호출. 선택을 확정하지 않는다.
   * 호출부가 상세 정보를 미리 받아두는 용도 — 드롭다운 자신은 무엇을 하는지 모른다.
   */
  onResultItemFocus?: (resultItem: MoveSearchItem) => void;
  accentedItemIndex?: number; // 방향키로 선택된 검색 결과 항목의 인덱스
  isSearchResultsFetching: boolean;
}

function SearchResultDropdown({
  searchResults,
  onResultItemClick,
  onResultItemFocus,
  accentedItemIndex = -1,
  isSearchResultsFetching,
}: SearchResultDropdownProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * 방향키로 옮긴 강조 항목이 목록 밖에 있으면 보이는 곳까지 스크롤한다.
   *
   * `block: "nearest"`라 이미 보이는 항목은 건드리지 않는다 —
   * 항목마다 목록을 가운데로 다시 맞추면 눈이 따라가기 어렵다.
   * `behavior: "instant"`인 이유는 키를 누르고 있을 때다:
   * 부드러운 스크롤은 애니메이션이 끝나기 전에 다음 이동이 들어와
   * 서로 취소시키며 목록이 떨린다.
   */
  useEffect(() => {
    if (accentedItemIndex < 0) return;
    itemRefs.current[accentedItemIndex]?.scrollIntoView({block: "nearest", behavior: "instant"});
  }, [accentedItemIndex]);

  if (isSearchResultsFetching) {
    return null;
  }

  return (
    <>
      {searchResults.length === 0 && (
        <div className="bg-white w-full min-h-10 max-h-45 overflow-y-auto rounded-lg absolute top-14 py-2 z-10">
          <p className="text-gray-400 text-xs flex justify-center items-center h-10">검색 결과가 없습니다.</p>
        </div>
      )}
      {searchResults.length > 0 && (
        <div className="bg-white w-full rounded-lg absolute top-14 py-2 px-1 z-10">
          <div className="flex flex-col overflow-y-auto min-h-10 max-h-45 ">
            {searchResults.map((resultItem, index) => (
              <div
                key={resultItem.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={`px-4 py-2 hover:bg-cyan-200 cursor-pointer text-sm text-gray-800 flex items-center justify-between
                  rounded-lg
                  ${index === accentedItemIndex ? "bg-cyan-100" : ""}`}
                onClick={() => onResultItemClick(resultItem)}
                onMouseEnter={() => onResultItemFocus?.(resultItem)}
              >
                <div>{resultItem.koreanName}</div>
                <TypeChip typeKor={resultItem.korType} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SearchResultDropdown;
