import type {RefObject} from "react";
import type {LearningPokemonItem} from "@/types/apiTypes";
import GuideErrorMsg from "../GuideErrorMsg/GuideErrorMsg";
import LearningPokemonCard from "../LearningPokemonCard/LearningPokemonCard";

interface LearningPokemonsResultsProps {
  /** 지금까지 불러온 모든 페이지를 이어붙인 목록 */
  pokemons: LearningPokemonItem[];
  /** 카드가 그릴 순서 그대로의 `moveId → 기술명` */
  moveNames: Map<number, string>;
  /** 배우는 방법이 하나 이상 선택돼 있는지 */
  hasLearnMethods: boolean;
  /** 검색 버튼을 눌러 조건이 확정된 적이 있는지 */
  hasSearched: boolean;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  /** 무한스크롤 감지 요소에 붙일 ref */
  sentinelRef: RefObject<HTMLDivElement | null>;
}

/**
 * 결과 영역 본문 — 상태에 따라 안내 문구 또는 포켓몬 카드 그리드를 그림
 *
 * 위에서부터 우선순위대로 걸러내며, 어느 것에도 걸리지 않으면 결과 그리드를 그림
 */
function LearningPokemonsResults({
  pokemons,
  moveNames,
  hasLearnMethods,
  hasSearched,
  isLoading,
  isError,
  isFetchingNextPage,
  sentinelRef,
}: LearningPokemonsResultsProps) {
  // 1) 배우는 방법 미선택 → 가이드 (최우선)
  if (!hasLearnMethods) {
    return <GuideErrorMsg>배우는 방법 옵션을 하나 이상 선택해주세요</GuideErrorMsg>;
  }
  // 2) 검색 실행 전
  if (!hasSearched) {
    return <GuideErrorMsg>기술을 담고 &apos;배우는 포켓몬 검색&apos; 버튼을 눌러 주세요</GuideErrorMsg>;
  }
  // 3) 최초 로딩 중 (이전 결과 없음) → 본문은 비우고 오버레이 로더가 이를 덮음
  //    ("결과 없음"으로 잘못 떨어지지 않도록 가드만 유지함)
  if (isLoading) {
    return null;
  }
  // 4) 에러
  if (isError) {
    return <GuideErrorMsg tone="error">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요</GuideErrorMsg>;
  }
  // 5) 결과 없음
  if (pokemons.length === 0) {
    return <GuideErrorMsg>조건을 모두 만족하는 포켓몬이 없습니다</GuideErrorMsg>;
  }

  // 6) 결과 그리드 + 무한스크롤 감지 요소
  return (
    <>
      <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-5">
        {pokemons.map((pokemon) => (
          <LearningPokemonCard key={pokemon.pokemonId} pokemon={pokemon} moveNames={moveNames} />
        ))}
      </div>

      {/* 다음 페이지 감지용 — 눈에 보이지 않고, 화면에 들어오면 24개를 더 불러옴 */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {isFetchingNextPage && <p className="py-6 text-center text-sm text-slate-400">데이터를 가져오는 중입니다</p>}
    </>
  );
}

export default LearningPokemonsResults;
