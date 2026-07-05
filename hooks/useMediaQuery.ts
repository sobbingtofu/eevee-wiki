import {useEffect, useState} from "react";

/**
 * SSR 안전 미디어쿼리 훅
 * - 서버/초기 렌더에서는 false, 마운트 후 실제 매칭값으로 갱신 및 변경 구독
 *
 * @example
 * const isBelowMd = useMediaQuery("(max-width: 767.98px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matchesGivenCondition, setMatchesGivenCondition] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatchesGivenCondition(mql.matches);

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matchesGivenCondition;
}

export default useMediaQuery;
