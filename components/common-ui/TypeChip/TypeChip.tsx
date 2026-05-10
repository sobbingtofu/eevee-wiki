import {TYPE_BG_CLASS_MAP, TYPE_MAP_EN_TO_KOR} from "@/store/constantStore";
import {pokemonType, pokemonTypeKor} from "@/types/pokemonDataType";
import {getPokemonTypeByKorType} from "@/utils/pokemonDataUtils";

interface TypeChipProps {
  typeEn?: pokemonType;
  typeKor?: pokemonTypeKor;
}

function TypeChip({typeEn, typeKor}: TypeChipProps) {
  // 국문타입 prop으로 받았으면 그대로 사용.
  // 국문타입 없이 영문타입만 prop으로 받았으면 영문타입을 한글로 변환해서 사용.
  // 둘 다 없으면 "알 수 없는 타입"으로 표시.
  const finalTypeText = typeKor ?? (typeEn ? TYPE_MAP_EN_TO_KOR[typeEn] : "알 수 없는 타입");

  // 영문타입 prop으로 받았으면 그대로 사용.
  // 영문타입 없이 국문타입만 prop으로 받았으면 국문타입을 영문으로 변환해서 사용.
  // 둘 다 없으면 normal 타입으로 간주.
  const typeBgClass = typeEn
    ? TYPE_BG_CLASS_MAP[typeEn]
    : typeKor
      ? TYPE_BG_CLASS_MAP[getPokemonTypeByKorType(typeKor)]
      : TYPE_BG_CLASS_MAP.normal;

  return (
    <div className={`px-2 py-1 rounded-md text-xs text-textWhite leading-none ${typeBgClass}`}>{finalTypeText}</div>
  );
}

export default TypeChip;
