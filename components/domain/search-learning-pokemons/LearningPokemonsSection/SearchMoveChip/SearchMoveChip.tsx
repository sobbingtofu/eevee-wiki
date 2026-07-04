import useMoveKoreanName from "@/hooks/useMoveKoreanName";

/** 상단 헤더의 검색 기술 이름 칩 */
function SearchMoveChip({moveId}: {moveId: number}) {
  const name = useMoveKoreanName(moveId);
  return (
    <span className="px-4 py-1.5 rounded-full border border-primary1/60 text-primary1 text-sm font-bold">{name}</span>
  );
}

export default SearchMoveChip;
