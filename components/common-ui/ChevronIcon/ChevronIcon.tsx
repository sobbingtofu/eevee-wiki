import {ComponentPropsWithoutRef} from "react";

type ChevronIconProps = ComponentPropsWithoutRef<"svg">;

/**
 * 아래 방향 셰브론(v) 아이콘
 * - stroke는 currentColor이므로 부모의 text 색상을 따름
 * - 크기/색/회전 등은 className으로 제어 (예: 펼침 시 rotate-180)
 */
export default function ChevronIcon(props: ChevronIconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
