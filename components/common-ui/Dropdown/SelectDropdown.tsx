"use client";

import {Fragment, useRef, useState} from "react";
import ChevronIcon from "@/components/common-ui/ChevronIcon/ChevronIcon";
import {useClickOutside} from "@/hooks/useClickOutside";

interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  /**
   * 있으면 목록에 그룹 헤더를 표시한다 (예: "9세대").
   * **연속된** 동일 값끼리 하나의 그룹으로 묶이므로, 옵션 배열이 그룹 순으로 정렬돼 있어야 한다.
   * 생략하면 헤더 없이 평평한 목록으로 렌더된다.
   */
  group?: string;
}

interface SelectDropdownProps<T extends string | number> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * 단일 선택 드롭다운
 * - 트리거 버튼에 현재 선택 라벨 표시, 클릭 시 옵션 목록 토글
 * - 외부 클릭 시 닫힘
 * - `option.group`이 있으면 그룹 헤더로 구분 (버전 드롭다운의 세대 구분에 사용)
 */
export function SelectDropdown<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: SelectDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-800/60 text-[10px] sm:text-xs lg:text-sm font-bold text-white cursor-pointer whitespace-nowrap"
      >
        <span>{selected?.label ?? ""}</span>
        <ChevronIcon className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute xl:right-0 right-auto left-0 md:left-auto top-full mt-2 z-20 min-w-[9rem] max-h-64 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 py-1 shadow-xl">
          {options.map((opt, index) => {
            // 직전 옵션과 그룹이 달라지는 지점에만 헤더를 끼워 넣는다
            const showGroupHeader = opt.group != null && opt.group !== options[index - 1]?.group;

            return (
              <Fragment key={String(opt.value)}>
                {showGroupHeader && (
                  <div className="px-4 pt-2 pb-1 text-[0.65rem] lg:text-xs font-bold text-slate-500 whitespace-nowrap">
                    {opt.group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs lg:text-sm cursor-pointer transition-colors whitespace-nowrap ${
                    opt.value === value
                      ? "text-primary1 font-bold bg-slate-700/50"
                      : "text-slate-300 hover:bg-slate-700/40"
                  }`}
                >
                  {opt.label}
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
