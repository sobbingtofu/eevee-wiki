import {useEffect, useRef, type RefObject} from "react";

/**
 * 지정한 ref 요소 바깥을 mousedown 했을 때 handler를 실행
 *
 * - enabled=false면 리스너를 아예 붙이지 않음 (예: 드롭다운이 닫혀 있을 때)
 * - handler 최신값을 ref로 유지하여, 콜백 identity 변경으로 인한 불필요한 재구독을 방지
 *
 * @param ref     외부 클릭 판별 기준이 되는 요소 ref
 * @param handler 바깥 클릭 시 실행할 콜백
 * @param enabled 리스너 활성화 여부 (기본 true)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true,
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      const element = ref.current;
      if (element && !element.contains(event.target as Node)) {
        savedHandler.current();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, enabled]);
}

export default useClickOutside;
