import TypeChip from "../TypeChip/TypeChip";
import type {MoveSearchItem} from "@/types/apiTypes";

interface SearchResultDropdownProps {
  searchResults: MoveSearchItem[];
  onResultItemClick: (resultItem: MoveSearchItem) => void;
  accentedItemIndex?: number; // 방향키로 선택된 검색 결과 항목의 인덱스
  isSearchResultsFetching: boolean;
}

function SearchResultDropdown({
  searchResults,
  onResultItemClick,
  accentedItemIndex = -1,
  isSearchResultsFetching,
}: SearchResultDropdownProps) {
  if (isSearchResultsFetching) {
    return null;
  }

  return (
    <>
      {searchResults.length === 0 && (
        <div className="bg-white w-full min-h-10 max-h-45 overflow-y-auto rounded-lg absolute top-14 py-2">
          <p className="text-gray-400 text-xs flex justify-center items-center h-10">검색 결과가 없습니다.</p>
        </div>
      )}
      {searchResults.length > 0 && (
        <div className="bg-white w-full rounded-lg absolute top-14 py-2 px-1">
          <div className="flex flex-col overflow-y-auto min-h-10 max-h-45 ">
            {searchResults.map((resultItem, index) => (
              <div
                key={resultItem.id}
                className={`px-4 py-2 hover:bg-cyan-200 cursor-pointer text-sm text-gray-800 flex items-center justify-between
                  rounded-lg
                  ${index === accentedItemIndex ? "bg-cyan-100" : ""}`}
                onClick={() => onResultItemClick(resultItem)}
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
