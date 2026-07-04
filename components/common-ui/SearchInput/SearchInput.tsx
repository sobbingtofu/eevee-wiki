"use client";

import {useEffect, useRef, useState} from "react";
import {Loader} from "../Loader/Loader";
import {GrayColoredCloseIcon} from "../CloseIcons/GrayColoredCloseIcon";
import SearchResultDropdown from "./SearchResultDropdown";
import {useSearchMoves} from "@/queries/moveQueries";
import type {MoveSearchItem} from "@/types/apiTypes";

interface SearchInputProps {
  outSideClickDropdownClose?: boolean; // 드롭다운 외부 클릭 시 드롭다운 닫기 기능 활성화 여부
  handleClickDropdownItem?: (resultItem: MoveSearchItem) => void; // 검색 결과 항목 클릭 시 호출되는 콜백 함수, 필요에 따라 수정
}

const ARROW_KEYDOWN_THROTTLE_DELAY = 80;

function SearchInput({outSideClickDropdownClose = true, handleClickDropdownItem = () => {}}: SearchInputProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accentedDropdownItemIndex, setAccentedDropdownItemIndex] = useState(-1); // 방향키로 선택된 검색 결과 항목의 인덱스 상태

  const lastArrowKeyTime = useRef<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const inputDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const {data: searchResults = [], isFetching: isSearchResultFetching} = useSearchMoves(searchValue);

  /**
   * 검색창 내 엔터키 입력 키다운 핸들러
   * - 디바운싱 즉시 종료시킴
   * - 검색 결과가 존재하고, 방향키로 선택 강조된 항목이 없을 때 → 검색 결과의 첫 번째 항목 선택 강조
   * - 검색 결과가 존재하고, 방향키로 선택 강조된 항목이 있을 때 → 해당 항목 클릭 핸들러 호출하여 검색 결과 선택 처리
   */
  const handleEnterKeyDown = () => {
    setIsDebouncing(false);
    if (searchResults.length > 0 && accentedDropdownItemIndex === -1) {
      setAccentedDropdownItemIndex(0);
      return;
    } else if (searchResults.length > 0 && accentedDropdownItemIndex >= 0) {
      const accentedItem = searchResults[accentedDropdownItemIndex];
      if (accentedItem) {
        handleClickDropdownItem(accentedItem);
      }
    }
  };

  /**
   * 검색창 내 방향키 입력 키다운 핸들러
   * - 디바운싱 즉시 종료시킴
   * - 검색 결과가 존재할 때에만 동작하도록 함
   */
  const handleArrowKeyDown = (arrow: "ArrowDown" | "ArrowUp") => {
    setIsDebouncing(false);
    if (searchResults.length > 0) {
      const currentTime = Date.now();
      if (currentTime - lastArrowKeyTime.current > ARROW_KEYDOWN_THROTTLE_DELAY) {
        if (arrow === "ArrowDown") {
          if (accentedDropdownItemIndex < searchResults.length - 1) {
            setAccentedDropdownItemIndex((prev) => prev + 1);
          } else {
            setAccentedDropdownItemIndex(0);
          }
        } else if (arrow === "ArrowUp") {
          if (accentedDropdownItemIndex > 0) {
            setAccentedDropdownItemIndex((prev) => prev - 1);
          } else {
            setAccentedDropdownItemIndex(searchResults.length - 1);
          }
        }

        lastArrowKeyTime.current = currentTime;
      }
    }
  };

  /**
   * - 엔터키, 위/아래 방향키 입력 시 각각의 핸들러 호출
   * - 검색 입력값이 변경될 때마다 드롭다운 미표시처리하며, 디바운싱을 적용하여 일정 딜레이 후 검색값 업데이트되도록 함
   * - 검색값이 업데이트 될 때, 검색값이 빈 문자열이 아니면 드롭다운을 열고, 빈 문자열이면 드롭다운을 닫음
   */
  const handleKeyDownSearchInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnterKeyDown();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      handleArrowKeyDown(e.key);
    }
    // 방향키, 엔터키 등 툭수입력 아닌 일반 입력 처리 핸들링은 여기부터
    else {
      setIsDebouncing(true);
      setIsDropdownOpen(false);
      setAccentedDropdownItemIndex(-1);
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
      }

      inputDebounceRef.current = setTimeout(() => {
        setSearchValue(inputRef.current?.value || "");
        setIsDebouncing(false);
        if (inputRef.current?.value !== "") {
          setIsDropdownOpen(true);
        } else {
          setIsDropdownOpen(false);
          setAccentedDropdownItemIndex(-1);
        }
      }, 400);
    }
  };

  /**
   * 검색창의 클로즈 아이콘 클릭 시 검색값 초기화 및 드롭다운 닫기
   */
  const handleClickCloseIcon = () => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setIsDropdownOpen(false);
    setAccentedDropdownItemIndex(-1);
  };

  useEffect(() => {
    return () => {
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
      }
    };
  }, []);

  // 드롭다운 외부 클릭 시 드롭다운 닫기 기능 구현
  useEffect(() => {
    if (outSideClickDropdownClose) {
      const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
          setAccentedDropdownItemIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [outSideClickDropdownClose]);

  /**
   * 검색창에 포커스 될 때, 검색값이 빈 문자열이 아니고 검색결과가 존재하면 드롭다운 열기
   */
  const handleInputFocus = () => {
    if (searchValue !== "" && searchResults.length > 0) setIsDropdownOpen(true);
  };

  return (
    <>
      <div className="relative w-full" ref={searchContainerRef}>
        {/* 검색창 */}
        <input
          ref={inputRef}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDownSearchInput}
          className="w-full pl-4 pr-10 py-4 rounded-2xl border-0 ring-1 ring-slate-700 bg-slate-900
          transition-all shadow-sm text-white text-sm relative outline-none focus:outline-none
          focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:ring-offset-slate-900"
          placeholder="기술 이름을 입력하세요..."
          type="text"
        />
        {(isDebouncing || isSearchResultFetching) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader sizeType={"small"} />
          </div>
        )}
        {!isDebouncing && !isSearchResultFetching && searchValue.trim() !== "" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <GrayColoredCloseIcon onClick={handleClickCloseIcon} />
          </div>
        )}

        {/* 검색결과 드롭다운 */}
        {isDropdownOpen && (
          <SearchResultDropdown
            isSearchResultsFetching={isSearchResultFetching}
            searchResults={searchResults}
            onResultItemClick={handleClickDropdownItem}
            accentedItemIndex={accentedDropdownItemIndex}
          />
        )}
      </div>
    </>
  );
}

export default SearchInput;
