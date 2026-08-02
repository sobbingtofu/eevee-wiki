/** 상단 헤더의 검색 기술 이름 칩 */
function SearchMoveChip({name}: {name: string}) {
  return (
    <span className="px-4 py-1.5 rounded-full border border-primary1/60 text-primary1 text-xs lg:text-sm font-bold">
      {name}
    </span>
  );
}

export default SearchMoveChip;
