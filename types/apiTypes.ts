/**
 * API 요청 / 응답 공통 타입 정의
 *
 * DB 테이블 대응:
 *  TB_MOVES, TB_TYPES, TB_POKEMONS,
 *  TB_ABILITIES, TB_CXN_POKEMON_TYPES,
 *  TB_CXN_POKEMON_ABILITIES, TB_CXN_POKEMON_MOVES,
 *  TB_GEN_INFO
 */

import {pokemonTypeKor} from "./pokemonDataType";

// ─────────────────────────────────────────
// 공통 원시 타입
// ─────────────────────────────────────────

/** TB_CXN_POKEMON_MOVES.learnMethod 가능 값 */
export type LearnMethod =
  | "level-up"
  | "machine"
  | "egg"
  | "tutor"
  | "train"
  | "light-ball-egg"
  | "form-change"
  | "stadium-surfing-pikachu";

/** learnMethod → 한국어 표기 매핑 */
export const LEARN_METHOD_KOR: Record<LearnMethod, string> = {
  "level-up": "레벨업",
  machine: "기술머신",
  egg: "교배",
  tutor: "기술가르침",
  /** 포켓몬 챔피언스의 트레이닝 메뉴에서 습득 (champions 전용) */
  train: "트레이닝",
  "light-ball-egg": "교배(라이트볼)",
  "form-change": "폼체인지",
  "stadium-surfing-pikachu": "스타디움",
};

/** TB_POKEMONS.stats / evStats JSONB 내 개별 스탯 항목 */
export interface StatEntry {
  statName: "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
  statValue: number;
}

/** TB_POKEMONS.evStats JSONB 내 개별 노력치 항목 */
export interface EvStatEntry {
  statName: "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
  evValue: number;
}

export type DamageClass = "physical" | "special" | "status";

export type DamageClassKor = "물리" | "특수" | "변화";

// ─────────────────────────────────────────
// 게임 버전(Version) 관련 타입
// ─────────────────────────────────────────

/**
 * GET /api/versions 응답 항목 — TB_GEN_INFO 중 실제 학습 데이터를 가진 버전
 *
 * 기술 학습 정보는 세대가 아니라 **버전 단위**로 조회한다.
 * 같은 8세대라도 소드·실드(75) / BDSP(53) / 레전드 아르세우스(10)처럼
 * 배우는 기술 폭이 크게 다르기 때문에, 세대로 묶으면 합집합이 되어 실제와 어긋난다.
 *
 * genNumber는 드롭다운 그룹 헤더 표기용이며 조회 조건으로 쓰지 않는다.
 */
export interface VersionInfo {
  /** TB_GEN_INFO.versionName — 조회 시 실제로 쓰는 식별자 */
  versionName: string;
  koreanName: string;
  /** 소속 세대 (참고용 메타데이터, 그룹 헤더는 groupLabel로 표시한다) */
  genNumber: number;
  /**
   * 드롭다운 그룹 헤더 문구 (예: "9세대").
   *
   * null이면 어느 세대에도 묶이지 않는 단독 타이틀이라는 뜻이고,
   * 목록 최상단에 헤더 없이 단독으로 표시된다. (포켓몬 챔피언스)
   */
  groupLabel: string | null;
  /**
   * 표시 우선순위 1~22. 값이 가장 큰 버전이 **초기 선택 버전**이 된다.
   * (출시 순이 아니다 — 기본 버전을 바꾸려면 이 값만 조정하면 된다)
   *
   * 목록에 나열되는 순서와는 별개다. 단독 타이틀이 항상 먼저 오기 때문.
   */
  displayOrder: number;
  /**
   * 이 버전에 실제로 존재하는 배우는 방법 (TB_GEN_INFO.learnMethods)
   *
   * 버전마다 다르다 — champions는 "train"만, 레전드 아르세우스는 기술머신이 없고,
   * 레드·블루 등 초기 버전은 기술가르침이 없다.
   * UI의 "배우는 방법" 필터는 이 목록으로 옵션을 좁혀야 한다.
   * (그러지 않으면 반드시 0건이 나오는 조합을 사용자가 고를 수 있다)
   */
  learnMethods: LearnMethodFilter[];
}

export type VersionsResponse = VersionInfo[];

// ─────────────────────────────────────────
// 기술(Move) 관련 타입
// ─────────────────────────────────────────

/**
 * GET /api/moves/search?q=펀치
 * 기술 국문명 검색 드롭다운용 간략 정보
 *
 * 드롭다운이 그리는 것만 담는다. `MoveBrief`와 의도적으로 분리돼 있다 —
 * 이건 "후보 목록"이고 brief는 "고른 하나의 상세"라, 필요해지는 시점도
 * 캐시 수명도 다르다. 여기에 brief 필드를 합치면 검색 응답이
 * 바구니 카드의 표시 항목에 끌려다니게 된다.
 */
export interface MoveSearchItem {
  id: number;
  koreanName: string;
  korType: pokemonTypeKor;
}

export type MoveSearchResponse = MoveSearchItem[];

/**
 * GET /api/moves/[id]/brief
 * 기술 바구니에 표시할 간략 정보
 */
export interface MoveBrief {
  id: number;
  koreanName: string;
  korType: pokemonTypeKor;
  power: number | null;
  accuracy: number | null;
  damageClass: DamageClass;
  description: string;
}

/**
 * GET /api/moves/[id]/detail
 * 기술 상세 페이지용 전체 정보
 */
export interface MoveDetail extends MoveBrief {
  korDescription: string | null;
  pp: number | null;
  effectChance: number | null;
  priority: number;
}

/**
 * GET /api/moves/[id]/learning-pokemons?version=scarlet-violet
 * 기술 상세 페이지 하단: 특정 버전에서 해당 기술을 배우는 포켓몬 목록
 */
export interface MoveLearningPokemonItem {
  pokemonId: number;
  koreanName: string;
  spriteUrl: string | null;
  korTypes: string[]; // 순서: slot 1, slot 2
  learnMethods: MoveLearnEntry[];
}

export interface MoveLearnEntry {
  learnMethod: LearnMethod;
  levelLearnedAt: number; // level-up 외에는 0
  versionName: string;
}

export type MoveLearningPokemonsResponse = MoveLearningPokemonItem[];

// ─────────────────────────────────────────
// 포켓몬(Pokemon) 관련 타입
// ─────────────────────────────────────────

/**
 * GET /api/pokemons/search?q=이상해씨
 * 포켓몬 국문명 검색 드롭다운용 간략 정보
 */
export interface PokemonSearchItem {
  pokemonId: number;
  koreanName: string;
  korTypes: string[]; // 순서: slot 1, slot 2
  spriteUrl: string | null;
}

export type PokemonSearchResponse = PokemonSearchItem[];

/**
 * 포켓몬 특성(Ability) 정보 — PokemonDetail 내부 사용
 *
 * koreanName 이 null 인 경우(9세대 신규 특성)에는 altKorName 사용
 * korDescription 이 null 인 경우에는 altKorDescription 사용
 */
export interface PokemonAbilityInfo {
  abilityId: number;
  /** TB_ABILITIES.koreanName (PokeAPI 공식 번역) */
  koreanName: string | null;
  /** TB_ABILITIES.altKorName (검색을 통해 보완한 한국어명, koreanName이 null일 때 사용) */
  altKorName: string | null;
  /** 표시용 이름: koreanName ?? altKorName */
  displayName: string;
  /** TB_ABILITIES.korDescription (PokeAPI 공식 번역 설명) */
  korDescription: string | null;
  /** TB_ABILITIES.altKorDescription (보완된 설명, korDescription이 null일 때 사용) */
  altKorDescription: string | null;
  /** 표시용 설명: korDescription ?? altKorDescription */
  displayDescription: string | null;
  isHidden: boolean;
}

/**
 * GET /api/pokemons/[id]
 * 포켓몬 상세 페이지 기본 정보 (이름, 이미지, 스탯, 타입, 특성)
 * 진화 체인은 GET /api/pokemons/[id]/evol 로 분리
 * 기술 목록은 GET /api/pokemons/[id]/moves?version=scarlet-violet 로 분리
 */
export interface PokemonDetail {
  pokemonId: number;
  speciesId: number | null;
  koreanName: string;
  officialArtworkUrl: string | null;
  spriteUrl: string | null;
  korTypes: string[]; // 순서: slot 1, slot 2
  stats: StatEntry[];
  evStats: EvStatEntry[];
  abilities: PokemonAbilityInfo[];
}

/**
 * GET /api/pokemons/[id]/moves?version=scarlet-violet
 * 포켓몬 상세 페이지 하단: 특정 버전에서 해당 포켓몬이 배우는 기술 목록
 */
export interface PokemonMoveItem {
  moveId: number;
  koreanName: string;
  korType: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: DamageClass;
  korDescription: string | null;
  learnMethods: PokemonMoveLearnEntry[];
}

export interface PokemonMoveLearnEntry {
  learnMethod: LearnMethod;
  levelLearnedAt: number;
  versionName: string;
}

export type PokemonMovesResponse = PokemonMoveItem[];

// ─────────────────────────────────────────
// 복수 기술 모두 배우는 포켓몬 검색 타입
// ─────────────────────────────────────────

/**
 * 검색 결과 정렬 기준 (12종)
 * - "name": 국문명 가나다순
 * - 단일 스탯: 해당 기본 스탯 값 기준
 * - 복합("a+b"): 해당 기본 스탯들의 합 기준
 */
export type PokemonSortKey =
  | "name"
  | "hp"
  | "attack"
  | "defense"
  | "speed"
  | "specialAttack"
  | "specialDefense"
  | "hp+defense"
  | "hp+specialDefense"
  | "hp+defense+specialDefense"
  | "attack+speed"
  | "specialAttack+speed";

/** 정렬 방향 (오름차순 / 내림차순) */
export type SortDirection = "asc" | "desc";

/**
 * 배우는 방법 필터 옵션 (LearnMethod 중 UI에 노출하는 4종)
 * - 멀티셀렉트, OR 방식(선택된 방법 중 하나라도로 배우면 자격)
 *
 * 4종 전부가 항상 유효한 것은 아니다. 실제 선택 가능한 목록은
 * 선택된 버전의 `VersionInfo.learnMethods`로 좁혀야 한다.
 */
export type LearnMethodFilter = Extract<LearnMethod, "level-up" | "machine" | "tutor" | "train">;

/** PokemonSortKey 전체 목록 (런타임 유효성 검사 / UI 렌더링용) */
export const POKEMON_SORT_KEYS: readonly PokemonSortKey[] = [
  "name",
  "hp",
  "attack",
  "defense",
  "speed",
  "specialAttack",
  "specialDefense",
  "hp+defense",
  "hp+specialDefense",
  "hp+defense+specialDefense",
  "attack+speed",
  "specialAttack+speed",
] as const;

/** SortDirection 전체 목록 */
export const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"] as const;

/**
 * LearnMethodFilter 전체 목록 (표시 순서 기준)
 *
 * 실제 UI에 띄울 옵션은 선택된 버전의 `VersionInfo.learnMethods`와 교집합을 취한다.
 */
export const LEARN_METHOD_FILTERS: readonly LearnMethodFilter[] = [
  "level-up",
  "machine",
  "tutor",
  "train",
] as const;

/** PokemonSortKey → 국문 라벨 (정렬 기준 드롭다운 표기) */
export const POKEMON_SORT_KEY_LABEL: Record<PokemonSortKey, string> = {
  name: "가나다순",
  hp: "HP",
  attack: "공격",
  defense: "방어",
  speed: "스피드",
  specialAttack: "특공",
  specialDefense: "특방",
  "hp+defense": "HP+방어",
  "hp+specialDefense": "HP+특방",
  "hp+defense+specialDefense": "HP+방어+특방",
  "attack+speed": "공격+스피드",
  "specialAttack+speed": "특공+스피드",
};

/** SortDirection → 국문 라벨 (정렬 방향 드롭다운 표기) */
export const SORT_DIRECTION_LABEL: Record<SortDirection, string> = {
  asc: "오름차순",
  desc: "내림차순",
};

/**
 * PokemonSortKey → 합산 대상 기본 스탯 필드 목록
 * ("name"은 스탯 정렬이 아니므로 제외)
 */
export const SORT_KEY_STAT_FIELDS: Record<Exclude<PokemonSortKey, "name">, StatEntry["statName"][]> = {
  hp: ["hp"],
  attack: ["attack"],
  defense: ["defense"],
  speed: ["speed"],
  specialAttack: ["specialAttack"],
  specialDefense: ["specialDefense"],
  "hp+defense": ["hp", "defense"],
  "hp+specialDefense": ["hp", "specialDefense"],
  "hp+defense+specialDefense": ["hp", "defense", "specialDefense"],
  "attack+speed": ["attack", "speed"],
  "specialAttack+speed": ["specialAttack", "speed"],
};

/**
 * POST /api/search-learning-pokemons
 * Request body
 */
export interface SearchLearningPokemonsRequest {
  /** 기술 바구니에 담긴 기술 id 배열 (1개 이상) */
  moveIds: number[];
  /** 검색 대상 게임 버전 (단일 선택, TB_GEN_INFO.versionName) */
  versionName: string;
  /** 정렬 기준 */
  sortKey: PokemonSortKey;
  /** 정렬 방향 */
  sortDirection: SortDirection;
  /** 배우는 방법 필터 (1개 이상, OR 방식 / 자격 판정에만 사용) */
  learnMethods: LearnMethodFilter[];
}

/**
 * POST /api/search-learning-pokemons 응답 — 개별 포켓몬 항목
 * moveLearnInfo: { [moveId]: 해당 버전에서의 학습 방법 목록 }
 */
export interface LearningPokemonItem {
  pokemonId: number;
  koreanName: string;
  spriteUrl: string | null;
  korTypes: string[];
  stats: StatEntry[];
  evStats: EvStatEntry[];
  /** key: moveId(number를 string으로 직렬화), value: 해당 버전에서의 학습방법 목록 */
  moveLearnInfo: Record<string, MoveLearnEntry[]>;
}

export type SearchLearningPokemonsResponse = LearningPokemonItem[];

// ─────────────────────────────────────────
// 진화 체인 타입
// ─────────────────────────────────────────

/**
 * PokeAPI evolution_details 의 단일 조건 항목
 * TB_CXN_EVOLUTIONS.evolutionDetails JSONB 내 배열 원소
 *
 * trigger 종류: "level-up" | "use-item" | "trade" | "shed" | "spin" |
 *               "tower-of-darkness" | "tower-of-waters" | "three-critical-hits" |
 *               "take-damage" | "other" | "agile-style-move" | "strong-style-move" |
 *               "recoil-damage"
 */
export interface EvolutionDetailEntry {
  trigger: string | null; // 진화 트리거 (level-up, use-item, trade ...)
  min_level: number | null; // 최소 레벨
  min_happiness: number | null; // 최소 친밀도
  time_of_day: string | null; // "day" | "night" | "" (시간대 조건)
  item: string | null; // 사용 아이템 이름 (use-item 트리거 시)
  held_item: string | null; // 지닌 아이템 이름
  known_move: string | null; // 알고 있어야 하는 기술 이름
  known_move_type: string | null; // 알고 있어야 하는 기술 타입
  location: string | null; // 진화 발생 장소
  min_affection: number | null; // 최소 애정도
  needs_overworld_rain: boolean | null; // 필드 비 조건
  party_species: string | null; // 파티 내 특정 포켓몬 조건
  party_type: string | null; // 파티 내 특정 타입 조건
  relative_physical_stats: number | null; // 공격↔방어 비교 (-1: 방어↑, 0: 동일, 1: 공격↑)
  trade_species: string | null; // 교환 대상 포켓몬
  turn_upside_down: boolean | null; // 기기를 뒤집는 조건
}

/**
 * 진화 체인 내 개별 포켓몬 폼
 * GET /api/pokemons/[id]/evol 응답의 chainData 배열 원소
 */
export interface EvolutionChainMember {
  pokemonId: number;
  chainLevel: number; // 1=기본형, 2=1차진화, 3=2차진화
  parentPokemonId: number | null; // 직전 진화 폼 ID (기본형이면 null)
  speciesNameEn: string;
  speciesNameKo: string | null;
  varietyNameEn: string; // ex. "meowth-alola"
  varietyNameKo: string | null; // ex. "나옹 (알로라 리전폼)"
  varietyKeyword: string; // 지역 키워드 KO ("알로라") or ""
  spriteUrl: string | null;
  officialArtworkUrl: string | null;
  korTypes: string[]; // TB_CXN_POKEMON_TYPES JOIN 결과
  evolutionDetails: EvolutionDetailEntry[] | null; // 진화 조건 (기본형은 null)
}

/**
 * GET /api/pokemons/[id]/evol 응답 타입
 * chainLevel 별로 그룹화된 진화 체인 데이터
 *
 * @example
 * [
 *   { chainLevel: 1, chainData: [이상해씨] },
 *   { chainLevel: 2, chainData: [이상해풀] },
 *   { chainLevel: 3, chainData: [이상해꽃] },
 * ]
 */
export type PokemonEvolutionChainResponse = {
  chainLevel: number;
  chainData: EvolutionChainMember[];
}[];

// ─────────────────────────────────────────
// API 공통 에러 응답 타입
// ─────────────────────────────────────────
export interface ApiErrorResponse {
  error: string;
}
