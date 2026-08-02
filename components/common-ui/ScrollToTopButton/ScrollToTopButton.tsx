import ChevronIcon from "@/components/common-ui/ChevronIcon/ChevronIcon";

interface ScrollToTopButtonProps {
  /** 보일지 여부 — false여도 언마운트하지 않고 투명하게만 둠 (아래 설명 참고) */
  visible: boolean;
  onClick: () => void;
  /** 위치 지정용 (기준이 되는 relative 조상은 호출부가 정함) */
  className?: string;
}

/**
 * 스크롤 영역을 맨 위로 되돌리는 둥근 버튼
 *
 * 숨길 때 언마운트하지 않고 투명도/위치만 되돌림 —
 * 조건부 렌더로 빼 버리면 사라지는 애니메이션이 재생될 대상이 없어 즉시 없어짐
 * 대신 숨은 동안에는 클릭·탭 이동을 받지 않도록 막아 둠
 *
 * 위치는 호출부가 className으로 정함 (스크롤되지 않는 조상에 붙여야 함께 밀려 올라가지 않음)
 */
function ScrollToTopButton({visible, onClick, className = ""}: ScrollToTopButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="맨 위로"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`w-11 h-11 rounded-full flex items-center justify-center
        bg-slate-800/90 backdrop-blur border border-slate-600 text-slate-200 shadow-lg
        hover:bg-slate-700 hover:text-white cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400
        transition-[opacity,transform,background-color,color] duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"}
        ${className}`}
    >
      <ChevronIcon className="w-5 h-5 rotate-180" />
    </button>
  );
}

export default ScrollToTopButton;
