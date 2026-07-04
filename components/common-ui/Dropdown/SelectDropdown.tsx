"use client";

import {useRef, useState} from "react";
import ChevronIcon from "@/components/common-ui/ChevronIcon/ChevronIcon";
import {useClickOutside} from "@/hooks/useClickOutside";

interface SelectOption<T extends string | number> {
  value: T;
  label: string;
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 text-sm font-bold text-white cursor-pointer whitespace-nowrap"
      >
        <span>{selected?.label ?? ""}</span>
        <ChevronIcon className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 min-w-[9rem] max-h-64 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                opt.value === value
                  ? "text-primary1 font-bold bg-slate-700/50"
                  : "text-slate-300 hover:bg-slate-700/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
