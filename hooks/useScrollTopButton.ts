import {useEffect, useRef, useState} from "react";

/** 이만큼 넘게 내려야 "맨 위로" 버튼이 나타남 (한두 줄 스크롤에 튀어나오지 않을 정도) */
const DEFAULT_THRESHOLD_PX = 240;

interface UseScrollTopButtonParams {
  /**
   * 이 값이 바뀌면 스크롤을 즉시 맨 위로 되돌림
   *
   * 목록의 내용 자체가 갈리는 시점(예: 새 검색 조건)을 넘기면 됨
   * 이전 목록을 그대로 두고 새 결과를 받는 화면에서, 되돌리지 않으면
   * 새 목록인데도 남의 목록 중간에서 시작하게 됨
   */
  resetKey?: string;
  /** 버튼이 나타나기 시작할 스크롤 위치(px) */
  thresholdPx?: number;
}

/**
 * 스크롤 컨테이너의 "맨 위로" 버튼에 필요한 것들을 모아 돌려줌
 *
 * - `scrollAreaRef` : 스크롤되는 요소에 붙임 (window가 아니라 이 컨테이너가 스크롤됨)
 * - `isScrolledDown`: 버튼을 보일지 여부
 * - `scrollToTop`   : 버튼 클릭 핸들러
 *
 * @example
 * const {scrollAreaRef, isScrolledDown, scrollToTop} = useScrollTopButton({resetKey: searchKey});
 */
export function useScrollTopButton<T extends HTMLElement>({
  resetKey,
  thresholdPx = DEFAULT_THRESHOLD_PX,
}: UseScrollTopButtonParams = {}) {
  const scrollAreaRef = useRef<T>(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const scrollToTop = () => scrollAreaRef.current?.scrollTo({top: 0, behavior: "smooth"});

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const update = () => setIsScrolledDown(el.scrollTop > thresholdPx);
    update(); // 마운트 시점의 현재 위치 반영

    el.addEventListener("scroll", update, {passive: true});
    return () => el.removeEventListener("scroll", update);
  }, [thresholdPx]);

  useEffect(() => {
    // 즉시 이동 — 목록이 갈린 것은 "되돌아가는" 게 아니라 처음부터 보는 것이라 애니메이션이 어색함
    // isScrolledDown은 여기서 건드리지 않음 — 이 스크롤이 scroll 이벤트를 일으켜 위 리스너가 알아서 내려줌
    scrollAreaRef.current?.scrollTo({top: 0, behavior: "instant"});
  }, [resetKey]);

  return {scrollAreaRef, isScrolledDown, scrollToTop};
}

export default useScrollTopButton;
