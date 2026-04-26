import {DamageClass, DamageClassKor} from "@/types/apiTypes";
import {pokemonType, pokemonTypeKor} from "@/types/pokemonDataType";

export const TYPE_MAP: {[key in pokemonType]: pokemonTypeKor} = {
  normal: "노말",
  fighting: "격투",
  flying: "비행",
  poison: "독",
  ground: "땅",
  rock: "바위",
  bug: "벌레",
  ghost: "고스트",
  steel: "강철",
  fire: "불",
  water: "물",
  grass: "풀",
  electric: "전기",
  psychic: "에스퍼",
  ice: "얼음",
  dragon: "드래곤",
  dark: "악",
  fairy: "페어리",
  stellar: "스텔라",
  unknown: "???",
  shadow: "???",
};

export const TYPE_BG_CLASS_MAP: {[key in pokemonType]: string} = {
  normal: "bg-normal",
  fighting: "bg-fighting",
  flying: "bg-flying",
  poison: "bg-poison",
  ground: "bg-ground",
  rock: "bg-rock",
  bug: "bg-bug",
  ghost: "bg-ghost",
  steel: "bg-steel",
  fire: "bg-fire",
  water: "bg-water",
  grass: "bg-grass",
  electric: "bg-electric",
  psychic: "bg-psychic",
  ice: "bg-ice",
  dragon: "bg-dragon",
  dark: "bg-dark",
  fairy: "bg-fairy",
  stellar: "bg-gray-500",
  unknown: "bg-gray-500",
  shadow: "bg-gray-500",
};

export const DAMAGE_CLASS_MAP: {[key in DamageClass]: DamageClassKor} = {
  physical: "물리",
  special: "특수",
  status: "변화",
};
