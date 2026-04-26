"use client";

import {useRef, useState} from "react";
import {Loader} from "../Loader/Loader";
import {CloseIcon} from "../CloseIcon/CloseIcon";
import SearchResultDropdown from "./SearchResultDropdown";

const SAMPLE = [
  {korName: "칼춤", damageClass: "변화", type: "normal"},
  {korName: "용의춤", damageClass: "변화", type: "dragon"},
  {korName: "신속", damageClass: "물리", type: "normal"},
  {korName: "오로라빔", damageClass: "특수", type: "ice"},
  {korName: "칼춤", damageClass: "변화", type: "normal"},
  {korName: "용의춤", damageClass: "변화", type: "dragon"},
  {korName: "신속", damageClass: "물리", type: "normal"},
  {korName: "오로라빔", damageClass: "특수", type: "ice"},
  {korName: "칼춤", damageClass: "변화", type: "normal"},
  {korName: "용의춤", damageClass: "변화", type: "dragon"},
  {korName: "신속", damageClass: "물리", type: "normal"},
  {korName: "오로라빔", damageClass: "특수", type: "ice"},
];

function MoveSearchInput() {
  const [searchValue, setSearchValue] = useState("");

  const [isDebouncing, setIsDebouncing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const inputDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDownSearchInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsDebouncing(true);

    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
    }

    inputDebounceRef.current = setTimeout(() => {
      setSearchValue(inputRef.current?.value || "");
      setIsDebouncing(false);
    }, 200);
  };

  const handleClickCloseIcon = () => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };
  return (
    <>
      <div className="relative w-full">
        {/* 검색창 */}
        <input
          ref={inputRef}
          onKeyDown={handleKeyDownSearchInput}
          className="w-full pl-4 pr-10 py-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900
          focus:ring-2 focus:ring-primary transition-all shadow-sm text-black text-sm relative"
          placeholder="기술 이름을 입력하세요..."
          type="text"
        />
        {isDebouncing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader sizeType={"small"} />
          </div>
        )}
        {!isDebouncing && searchValue.trim() !== "" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseIcon onClick={handleClickCloseIcon} />
          </div>
        )}
        {/* 검색결과 드롭다운 */}
        {!isDebouncing && searchValue.trim() !== "" && (
          <SearchResultDropdown
            searchResults={SAMPLE.filter((item) => item.korName.includes(searchValue))}
            onResultItemClick={(item) => console.log(item)}
          />
        )}
      </div>
    </>
  );
}

export default MoveSearchInput;
