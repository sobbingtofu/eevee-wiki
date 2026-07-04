import {useMoveBrief} from "@/queries/moveQueries";

/** 상단/카드에서 moveId → 기술 국문명 표기 (bucket에서 이미 캐시된 brief를 재사용) */
function useMoveKoreanName(moveId: number): string {
  const {data} = useMoveBrief(moveId);
  return data?.koreanName ?? `기술 #${moveId}`;
}

export default useMoveKoreanName;
