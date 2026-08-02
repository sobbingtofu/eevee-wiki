/**
 * 배우는 포켓몬 검색 결과 정렬 (서버 처리)
 *
 * - "name": 국문명 가나다순 (ko 로케일)
 * - 스탯/복합 스탯: 해당 기본 스탯들의 합 기준
 * - 동점 시 pokemonId 오름차순으로 안정 정렬 (방향과 무관)
 */
import {SORT_KEY_STAT_FIELDS} from "@/types/apiTypes";
import type {PokemonSortKey, SortDirection, StatEntry} from "@/types/apiTypes";

/**
 * 정렬에 실제로 필요한 최소 데이터들
 * - 페이지네이션 때문에 응답을 조립하기 전, 가벼운 행 상태에서 정렬 수행함
 */
export interface SortableLearningPokemon {
  pokemonId: number;
  koreanName: string;
  stats: StatEntry[];
}

/** stats 배열에서 지정한 필드들의 값 합산 (누락 필드는 0) */
function sumStats(stats: StatEntry[], fields: StatEntry["statName"][]): number {
  const valueByName = new Map(stats.map((s) => [s.statName, s.statValue]));
  return fields.reduce((sum, field) => sum + (valueByName.get(field) ?? 0), 0);
}

export function sortLearningPokemons<T extends SortableLearningPokemon>(
  items: T[],
  sortKey: PokemonSortKey,
  sortDirection: SortDirection,
): T[] {
  const directionFactor = sortDirection === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    let cmp: number;
    if (sortKey === "name") {
      cmp = a.koreanName.localeCompare(b.koreanName, "ko");
    } else {
      const fields = SORT_KEY_STAT_FIELDS[sortKey];
      cmp = sumStats(a.stats, fields) - sumStats(b.stats, fields);
    }

    if (cmp !== 0) return cmp * directionFactor;

    // 동점 타이브레이크: pokemonId 오름차순 고정 (안정적 순서 보장)
    return a.pokemonId - b.pokemonId;
  });
}
