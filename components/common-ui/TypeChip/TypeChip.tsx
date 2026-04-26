import {TYPE_BG_CLASS_MAP, TYPE_MAP} from "@/store/constantStore";
import {pokemonType} from "@/types/pokemonDataType";

interface TypeChipProps {
  type: pokemonType;
}

function TypeChip({type}: TypeChipProps) {
  const typeText = TYPE_MAP[type] || "알 수 없음"; // 타입이 매핑에 없는 경우 기본값 설정
  const typeBgClass = TYPE_BG_CLASS_MAP[type] || TYPE_BG_CLASS_MAP.normal;

  return <div className={`px-2 py-1 rounded-md text-xs text-textWhite leading-none ${typeBgClass}`}>{typeText}</div>;
}

export default TypeChip;
