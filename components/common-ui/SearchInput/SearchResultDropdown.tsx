import TypeChip from "../TypeChip/TypeChip";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type resultItem = any[]; // 검색 결과 항목의 타입에 맞게 수정

interface SearchResultDropdownProps {
  searchResults: resultItem; // 검색 결과 데이터 타입에 맞게 수정
  onResultItemClick: (resultItem: resultItem) => void; // 검색 결과 항목 클릭 시 호출되는 콜백 함수, 필요에 따라 수정
}

function SearchResultDropdown({searchResults, onResultItemClick}: SearchResultDropdownProps) {
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
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center justify-between"
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
