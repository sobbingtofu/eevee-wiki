import TypeChip from "../TypeChip/TypeChip";
import {SampleSearchResultItem} from "./SearchInput";

interface SearchResultDropdownProps {
  searchResults: SampleSearchResultItem[]; // 검색 결과 데이터 타입에 맞게 수정
  onResultItemClick: (resultItem: SampleSearchResultItem) => void; // 검색 결과 항목 클릭 시 호출되는 콜백 함수, 필요에 따라 수정
  accentedItemIndex?: number; // 방향키로 선택된 검색 결과 항목의 인덱스, 필요에 따라 수정
}

function SearchResultDropdown({searchResults, onResultItemClick, accentedItemIndex = -1}: SearchResultDropdownProps) {
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
                key={index}
                className={`px-4 py-2 hover:bg-cyan-200 cursor-pointer text-sm text-gray-800 flex items-center justify-between
                  rounded-lg
                  ${index === accentedItemIndex ? "bg-cyan-100" : ""}`}
                onClick={() => onResultItemClick(resultItem)}
              >
                <div>{resultItem.korName}</div>
                <TypeChip type={resultItem.type} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SearchResultDropdown;
