import {useMemo} from "react";
import {useMoveNames} from "@/queries/moveQueries";
import type {LearningPokemonItem} from "@/types/apiTypes";

/**
 * 기술 이름 표기 — 아직 받아오지 못한 기술은 id로 대체함
 * `useMoveNames`는 받아온 것만 담아 주므로, 대체 문구는 표시하는 쪽인 여기서만 정함
 */
function moveNameLabel(moveNames: Map<number, string>, moveId: number): string {
  return moveNames.get(moveId) ?? `기술 #${moveId}`;
}

/**
 * 결과 화면에 필요한 기술 이름들을 한 번에 조회해 표시용 Map 두 개로 만들어 줌
 *
 * 왜 부모에서 한 번만 조회하는가:
 *   카드마다 이름을 조회하면 (포켓몬 수 × 기술 수)만큼 구독이 생김
 *   무엇보다 부모가 이미 아는 값을 리프가 전역 캐시에서 다시 꺼내는 모양이 됨
 *
 * 조회 대상이 두 목록의 합집합인 이유:
 *   칩은 `committedMoveIds`를, 카드는 응답에서 역산한 id를 그림
 *   기술을 담고 아직 재검색하기 전에는 이 둘이 잠시 어긋나므로 양쪽 다 필요함
 *
 * @returns `moveNamesForChips` 헤더 칩용 / `moveNamesForCards` 카드용
 *          (둘 다 그릴 순서대로 담겨 있어 id 배열을 따로 넘길 필요가 없음)
 */
export function useLearningMoveNames(committedMoveIds: number[], learningPokemons: LearningPokemonItem[]) {
  // 카드가 그릴 기술 id는 응답 데이터 기준임 (표시 데이터와 항상 일치시키기 위함)
  const moveIdsForCards = useMemo(() => {
    const first = learningPokemons[0];
    if (!first) return [];
    return Object.keys(first.moveLearnInfo).map(Number);
  }, [learningPokemons]);

  const moveIdsToLookUp = useMemo(
    () => [...new Set([...committedMoveIds, ...moveIdsForCards])],
    [committedMoveIds, moveIdsForCards],
  );

  const moveNameMap = useMoveNames(moveIdsToLookUp);

  const moveNamesForChips = useMemo(
    () => new Map(committedMoveIds.map((id) => [id, moveNameLabel(moveNameMap, id)])),
    [committedMoveIds, moveNameMap],
  );

  const moveNamesForCards = useMemo(
    () => new Map(moveIdsForCards.map((id) => [id, moveNameLabel(moveNameMap, id)])),
    [moveIdsForCards, moveNameMap],
  );

  return {moveNamesForChips, moveNamesForCards};
}

export default useLearningMoveNames;
