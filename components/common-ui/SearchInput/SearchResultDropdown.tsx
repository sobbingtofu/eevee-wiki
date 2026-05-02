import TypeChip from "../TypeChip/TypeChip";
import {pokemonTypeKor, pokemonType} from "@/types/pokemonDataType";
import type {MoveSearchItem} from "@/types/apiTypes";

const KOR_TYPE_TO_TYPE: Record<pokemonTypeKor, pokemonType> = {
  노말: "normal",
  격투: "fighting",
  비행: "flying",
  독: "poison",
  땅: "ground",
  바위: "rock",
  벌레: "bug",
  고스트: "ghost",
  강철: "steel",
  불: "fire",
  물: "water",
  풀: "grass",
  전기: "electric",
  에스퍼: "psychic",
  얼음: "ice",
  드래곤: "dragon",
  악: "dark",
  페어리: "fairy",
  스텔라: "stellar",
  "???": "unknown",
  섀도우: "shadow",
};

interface SearchResultDropdownProps {
  searchResults: MoveSearchItem[];
  onResultItemClick: (resultItem: MoveSearchItem) => void;
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
                key={resultItem.id}
                className={`px-4 py-2 hover:bg-cyan-200 cursor-pointer text-sm text-gray-800 flex items-center justify-between
                  rounded-lg
                  ${index === accentedItemIndex ? "bg-cyan-100" : ""}`}
                onClick={() => onResultItemClick(resultItem)}
              >
                <div>{resultItem.koreanName}</div>
                <TypeChip type={KOR_TYPE_TO_TYPE[resultItem.korType as pokemonTypeKor] ?? "unknown"} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SearchResultDropdown;
