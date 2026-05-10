import {TYPE_MAP_KOR_TO_EN} from "@/store/constantStore";
import {pokemonType, pokemonTypeKor} from "@/types/pokemonDataType";

/**
 * 한국어 타입명을 입력받아 영어 타입명(pokemonType)을 반환하는 유틸 함수
 */
export function getPokemonTypeByKorType(korType: string): pokemonType {
  return TYPE_MAP_KOR_TO_EN[korType as pokemonTypeKor] ?? "unknown";
}
