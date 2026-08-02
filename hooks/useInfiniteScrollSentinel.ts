import {useEffect, useRef} from "react";

/**
 * 무한스크롤 감지 요소용 ref를 반환하는 커스텀 훅
 * 돌려받은 ref를 목록 마지막 아래의 (사람 눈에 보이지 않는) 요소에 붙이면
 * 그 요소가 화면에 들어오는 순간 onIntersect 함수가 호출됨
 *
 * @param onIntersect 감지 요소가 화면에 들어왔을 때 실행할 콜백 (보통 fetchNextPage)
 * @param enabled     감지 활성화 여부. **다음 페이지가 있고, 지금 불러오는 중이 아닐 때만 true**로 줄 것.
 *                    마지막 페이지에서는 감지 요소가 계속 보이는 상태로 남기 때문에
 *                    이 가드가 없으면 콜백이 무한히 반복됨
 * @param rootMargin  바닥에 닿기 전에 미리 부르기 위한 여유. 기본 200px.
 *
 */
export function useInfiniteScrollSentinel<T extends HTMLElement>(
  onIntersect: () => void,
  enabled: boolean,
  rootMargin: string = "200px",
) {
  const sentinelRef = useRef<T>(null);

  // 콜백 identity가 매 렌더 바뀌어도 옵저버를 다시 만들지 않도록 ref로 보관
  const savedOnIntersect = useRef(onIntersect);
  useEffect(() => {
    savedOnIntersect.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!enabled || !element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) savedOnIntersect.current();
      },
      {rootMargin},
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}

export default useInfiniteScrollSentinel;
