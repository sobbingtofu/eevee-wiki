/**
 * 배우는 포켓몬 검색 결과 정렬 (서버 처리)
 *
 * - "name": 국문명 가나다순 (ko 로케일)
 * - 스탯/복합 스탯: 해당 기본 스탯들의 합 기준
 * - 동점 시 pokemonId 오름차순으로 안정 정렬 (방향과 무관)
 */
import {SORT_KEY_STAT_FIELDS} from "@/types/apiTypes";
import type {LearningPokemonItem, PokemonSortKey, SortDirection, StatEntry} from "@/types/apiTypes";

/** stats 배열에서 지정한 필드들의 값 합산 (누락 필드는 0) */
function sumStats(stats: StatEntry[], fields: StatEntry["statName"][]): number {
  const valueByName = new Map(stats.map((s) => [s.statName, s.statValue]));
  return fields.reduce((sum, field) => sum + (valueByName.get(field) ?? 0), 0);
}

export function sortLearningPokemons(
  items: LearningPokemonItem[],
  sortKey: PokemonSortKey,
  sortDirection: SortDirection,
): LearningPokemonItem[] {
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
