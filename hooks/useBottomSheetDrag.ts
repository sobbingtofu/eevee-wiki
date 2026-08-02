import {useEffect, useRef, useState, type CSSProperties, type PointerEvent} from "react";
import {useClickOutside} from "./useClickOutside";
import {hasScrollableAncestor} from "@/utils/domUtils";

/**
 * 드래그를 확정으로 볼 최소 이동 거리(px)
 *
 * 이만큼 아래로 끌고 놓으면 닫히고, 위로 끌고 놓으면 열림
 * 못 미치면 손을 뗀 자리와 무관하게 원래 상태로 되돌아감
 * ("화면 절반을 넘겼는가"로 보면 시트가 클수록 한참 끌어야 닫혀서 잘 닫히지 않음)
 */
const SHEET_COMMIT_DRAG_PX = 80;

/** 이 정도 움직임까지는 "탭"으로 봄 (손가락은 가만히 눌러도 몇 px 흔들리니까) */
const SHEET_TAP_SLOP_PX = 8;

/**
 * 여기 안에서 시작한 포인터 입력은 시트 드래그로 삼지 않음
 * (드롭다운 버튼·체크박스를 누르려던 것을 시트 끌기로 가로채면 조작이 불가능해지기 때문)
 */
const SHEET_DRAG_EXCLUDED_SELECTOR = "button, a, input, select, textarea, label, [data-sheet-no-drag]";

interface UseBottomSheetDragParams {
  /** 바텀시트로 동작하는 구간인지 (데스크톱에서는 정적 패널이라 false) */
  enabled: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  /** 닫힘 상태에서 화면 하단에 남겨둘 핸들 영역 높이(px) */
  peekPx: number;
}

/**
 * 모바일 바텀시트의 드래그 여닫기 일체를 담당함
 *
 * 돌려주는 것
 *  - `sheetRef`         : 시트 루트에 붙임 (높이 계산·바깥 클릭·스크롤 전파 차단의 기준)
 *  - `sheetStyle`       : 시트 루트의 인라인 style (드래그 중 실시간 translate)
 *  - `dragHandleProps`  : 손잡이용 — 포인터 핸들러 + 탭 토글
 *  - `sheetDragProps`   : 헤더 등 "끌 수 있는 다른 영역"용 — 포인터 핸들러만 (탭 토글 없음)
 *
 * 바깥 클릭으로 닫는 처리도 여기서 함께 함
 */
export function useBottomSheetDrag({enabled, isOpen, setOpen, peekPx}: UseBottomSheetDragParams) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{startY: number; base: number; closedPx: number} | null>(null);
  // 드래그로 상태를 확정한 직후 이어지는 click을 한 번 무시하기 위한 표시 (pointerdown마다 초기화됨)
  const suppressClickRef = useRef(false);
  // 드래그 중 실시간 translate(px). null이면 드래그 중이 아님(정지 상태는 클래스/열림 인라인이 지배함)
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);
  // 창 밖에서 끝난 드래그를 정리할 때 최신 위치를 읽기 위한 거울 (이벤트 리스너는 state를 낡은 값으로 붙잡음)
  const dragTranslateRef = useRef<number | null>(null);

  const updateDragTranslate = (next: number | null) => {
    dragTranslateRef.current = next;
    setDragTranslate(next);
  };

  /**
   * 드래그 종료를 한 곳으로 모음 — 정상 종료든 창 밖 이탈이든 여기로만 끝남
   *
   * 여러 경로(요소 pointerup, window pointerup, buttons 검사, blur)에서 불릴 수 있으므로
   * `dragStartRef`가 비어 있으면 조용히 빠져나가 두 번 처리되지 않게 함
   *
   * @param commit 끈 거리로 여닫기를 확정할지 여부.
   *               사용자가 버튼을 뗀 경우엔 true, 취소로 봐야 하는 경우(창 포커스 상실 등)엔 false
   */
  const endDrag = (commit: boolean) => {
    const start = dragStartRef.current;
    if (!start) return;

    // 시작 지점에서 얼마나 끌었는지로 판정함
    const dragged = (dragTranslateRef.current ?? start.base) - start.base; // 아래로 +, 위로 -

    // 실제로 끌었다면 뒤따라오는 click(손잡이의 토글)을 무시하도록 표시함
    // 표시하지 않으면 pointerup으로 정한 상태를 click이 곧바로 뒤집어 버림
    if (Math.abs(dragged) > SHEET_TAP_SLOP_PX) suppressClickRef.current = true;

    if (commit) {
      if (dragged > SHEET_COMMIT_DRAG_PX) {
        setOpen(false);
      } else if (dragged < -SHEET_COMMIT_DRAG_PX) {
        setOpen(true);
      }
      // 임계값에 못 미치면 상태를 그대로 두고, 아래 updateDragTranslate(null)로 원래 자리에 되돌림
    }

    dragStartRef.current = null;
    updateDragTranslate(null);
  };

  // window 리스너가 항상 최신 endDrag를 부르도록 거울에 담아 둠
  // (매 렌더 새로 만들어지는 함수라 의존성 배열 없이 렌더마다 갱신함)
  const endDragRef = useRef(endDrag);
  useEffect(() => {
    endDragRef.current = endDrag;
  });

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // 드롭다운·체크박스를 누르려던 입력을 시트 끌기로 가로채지 않음
    if (e.target instanceof Element && e.target.closest(SHEET_DRAG_EXCLUDED_SELECTOR)) return;

    const height = sheetRef.current?.offsetHeight ?? 0;
    const closedPx = Math.max(height - peekPx, 0);
    const base = isOpen ? 0 : closedPx;
    dragStartRef.current = {startY: e.clientY, base, closedPx};
    suppressClickRef.current = false;
    updateDragTranslate(base);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    /**
     * 창 밖에서 버튼을 뗀 경우엔 pointerup이 오지 않아 드래그가 끝난 줄 모름
     * 그 상태로 마우스가 다시 들어오면 누르지도 않은 채 시트가 커서를 따라다니게 됨
     * 다시 들어온 첫 이동에서 "눌린 버튼 없음"을 보고 여기서 끝냄
     * (터치·펜은 닿아 있는 동안 buttons가 1이므로 이 검사에 걸리지 않음)
     */
    if (e.buttons === 0) {
      endDrag(true);
      return;
    }

    const delta = e.clientY - start.startY; // 아래로 드래그하면 +, 위로 드래그하면 -
    const next = Math.min(Math.max(start.base + delta, 0), start.closedPx);
    updateDragTranslate(next);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag(true);
  };

  const handlePointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // 브라우저가 입력을 앗아간 경우라 사용자가 놓은 게 아님 → 여닫기를 확정하지 않고 제자리로 되돌림
    endDrag(false);
  };

  /**
   * 드래그가 창 밖에서 끝나는 경우를 받아 냄
   *
   * `setPointerCapture`를 잡아도 **창 밖에서 버튼을 떼면 pointerup이 요소로 오지 않음**
   * 그러면 드래그 상태가 그대로 남아 시트가 `transition: none` 인 채로 갇히고,
   * 마우스가 다시 들어오는 순간 커서를 따라다니며 동작이 망가짐
   *
   * 드래그 중일 때만 붙여 두고, 어디서 떼든 window에서 받아 정리함
   * 창 포커스가 통째로 빠지는 경우(alt+tab 등)는 사용자가 놓은 게 아니므로 확정하지 않고 되돌림
   */
  const isDragging = dragTranslate !== null;

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerUp = () => endDragRef.current(true);
    const handleWindowCancel = () => endDragRef.current(false);

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowCancel);
    window.addEventListener("blur", handleWindowCancel);
    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowCancel);
      window.removeEventListener("blur", handleWindowCancel);
    };
  }, [isDragging]);

  /** 손잡이 탭 = 여닫기 토글. 단, 방금 끌어서 상태를 정했다면 그 결과를 뒤집지 않음 */
  const handleHandleClick = () => {
    if (suppressClickRef.current) return;
    setOpen(!isOpen);
  };

  /**
   * 시트 안에서 시작한 스크롤이 **뒤쪽 페이지를 움직이지 못하게** 막음
   *
   * 시트는 fixed지만 DOM상으로는 여전히 페이지의 자식이라,
   * 시트 안의 스크롤되지 않는 곳(헤더 등)에서 휠·터치를 하면
   * 브라우저가 조상으로 거슬러 올라가 그 아래의 영역을 스크롤해 버림
   *
   * `touch-action: none`을 쓰지 않은 이유:
   *   조상에 걸면 그 안쪽의 스크롤 영역(결과 목록, 버전 드롭다운)까지 함께 죽음
   *   여기서는 **스스로 스크롤되는 요소 위에서는 막지 않도록** 판별해 막을 곳만 골라 막음
   *
   * 이게 헤더 드래그가 동작하는 데도 필요함 —
   * 브라우저가 터치를 페이지 패닝으로 채가면 `pointercancel`이 날아와 드래그가 중간에 끊김
   *
   * React의 onWheel/onTouchMove는 passive로 등록돼 preventDefault가 통하지 않아 네이티브로 붙임
   */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!enabled || !sheet) return;

    const blockScrollChaining = (event: WheelEvent | TouchEvent) => {
      if (event.target instanceof Element && hasScrollableAncestor(event.target, sheet)) return;
      if (event.cancelable) event.preventDefault();
    };

    sheet.addEventListener("wheel", blockScrollChaining, {passive: false});
    sheet.addEventListener("touchmove", blockScrollChaining, {passive: false});
    return () => {
      sheet.removeEventListener("wheel", blockScrollChaining);
      sheet.removeEventListener("touchmove", blockScrollChaining);
    };
  }, [enabled]);

  // 시트로 동작하는 구간 + 열림 상태일 때만, 시트 외부 영역 클릭 시 닫음
  useClickOutside(sheetRef, () => setOpen(false), enabled && isOpen);

  // 모바일에서만 인라인 translate 적용 (데스크톱은 정적 패널이라 인라인 없음)
  // 닫힘(비드래그) 상태는 인라인을 주지 않고 클래스의 translate가 지배함 → 최초 렌더 깜빡임 방지
  let sheetStyle: CSSProperties | undefined;
  if (enabled) {
    if (dragTranslate !== null) {
      sheetStyle = {translate: `0px ${dragTranslate}px`, transition: "none"};
    } else if (isOpen) {
      sheetStyle = {translate: "0px 0px"};
    }
  }

  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  // 손잡이는 CSS로 모바일에서만 보이므로 enabled와 무관하게 항상 붙임
  const dragHandleProps = {...pointerHandlers, onClick: handleHandleClick};

  // 헤더처럼 데스크톱에서도 화면에 있는 영역은 시트 구간에서만 끌 수 있게 함
  const sheetDragProps = enabled ? pointerHandlers : {};

  return {sheetRef, sheetStyle, dragHandleProps, sheetDragProps};
}

export default useBottomSheetDrag;
