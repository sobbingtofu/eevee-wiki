import PlainCloseIcon from "./PlainCloseIcon";

interface CloseIconProps {
  onClick?: () => void;
}

/**
 * 회색 X(닫기) 아이콘
 * - currentColor 기반 인라인 SVG(PlainCloseIcon)를 재사용하여 색상은 text-slate-400로 지정
 */
export const GrayColoredCloseIcon = ({onClick}: CloseIconProps) => {
  return (
    <div className="select-none cursor-pointer text-slate-400" onClick={onClick}>
      <PlainCloseIcon className="w-5 h-5" />
    </div>
  );
};
