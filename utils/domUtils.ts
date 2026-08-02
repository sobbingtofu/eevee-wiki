/**
 * target에서 boundary까지 거슬러 올라가며, 실제로 스크롤되는 조상이 있는지 확인함
 *
 * - `overflow-y`가 auto/scroll이면서 내용이 실제로 넘치는 요소만 참으로 봄
 *   (스타일만 걸려 있고 넘치지 않으면 스크롤되지 않으므로 제외해야 함)
 * - 열린 드롭다운 목록처럼 자기 스크롤을 가진 요소를 가려내는 용도임
 *
 * @param target   판별을 시작할 요소 (보통 이벤트의 target)
 * @param boundary 여기까지만 거슬러 올라감 (이 요소 자신은 검사하지 않음)
 */
export function hasScrollableAncestor(target: Element, boundary: Element): boolean {
  let el: Element | null = target;
  while (el && el !== boundary) {
    const {overflowY} = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return true;
    el = el.parentElement;
  }
  return false;
}
