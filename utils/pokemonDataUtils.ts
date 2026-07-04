import {TYPE_MAP_KOR_TO_EN} from "@/store/constantStore";
import {LEARN_METHOD_KOR, MoveLearnEntry} from "@/types/apiTypes";
import {pokemonType, pokemonTypeKor} from "@/types/pokemonDataType";

/**
 * 한국어 타입명을 입력받아 영어 타입명(pokemonType)을 반환하는 유틸 함수
 */
export function getPokemonTypeByKorType(korType: string): pokemonType {
  return TYPE_MAP_KOR_TO_EN[korType as pokemonTypeKor] ?? "unknown";
}

/**
 * 특정 기술의 학습방법 목록을 "레벨업(50), 기술머신" 형태의 문자열로 변환
 * - 같은 학습방법은 중복 제거 (여러 버전에 걸쳐 중복 등장하므로)
 * - level-up 은 습득 레벨을 괄호로 병기
 */
export function formatLearnMethods(entries: MoveLearnEntry[]): string {
  if (!entries || entries.length === 0) return "-";

  const labels = new Set<string>();
  for (const entry of entries) {
    const base = LEARN_METHOD_KOR[entry.learnMethod] ?? entry.learnMethod;
    if (entry.learnMethod === "level-up" && entry.levelLearnedAt > 0) {
      labels.add(`${base}(${entry.levelLearnedAt})`);
    } else {
      labels.add(base);
    }
  }

  return [...labels].join(", ");
}
