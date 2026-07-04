"use client";

import {useEffect, useRef, useState} from "react";

interface CheckboxOption<T extends string> {
  value: T;
  label: string;
}

interface CheckboxDropdownProps<T extends string> {
  /** 트리거 버튼에 항상 표시할 고정 라벨 (예: "배우는 방법") */
  label: string;

  options: CheckboxOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  className?: string;
}

/**
 * 멀티 선택(체크박스) 드롭다운
 * - 각 항목 체크/해제 시 onToggle 즉시 호출 (드롭다운은 열린 채 유지)
 * - 외부 클릭 시 닫힘
 */
export function CheckboxDropdown<T extends string>({
  label,
  options,
  selected,
  onToggle,
  className,
}: CheckboxDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 드롭다운 외부 클릭 시 닫기 이벤트 리스터 부착
   */
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 text-sm font-bold text-white cursor-pointer whitespace-nowrap"
      >
        <span>{label}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 min-w-[10rem] rounded-xl bg-slate-800 border border-slate-700 py-1 shadow-xl">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-slate-700/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="w-4 h-4 accent-primary1 cursor-pointer"
                />
                <span className={checked ? "text-white font-bold" : "text-slate-300"}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
