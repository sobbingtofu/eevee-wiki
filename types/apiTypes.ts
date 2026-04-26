/**
 * API 요청 / 응답 공통 타입 정의
 *
 * DB 테이블 대응:
 *  TB_MOVES, TB_TYPES, TB_POKEMONS,
 *  TB_ABILITIES, TB_CXN_POKEMON_TYPES,
 *  TB_CXN_POKEMON_ABILITIES, TB_CXN_POKEMON_MOVES,
 *  TB_GEN_INFO
 */

// ─────────────────────────────────────────
// 공통 원시 타입
// ─────────────────────────────────────────

/** TB_CXN_POKEMON_MOVES.learnMethod 가능 값 */
export type LearnMethod =
  | "level-up"
  | "machine"
  | "egg"
  | "tutor"
  | "light-ball-egg"
  | "form-change"
  | "stadium-surfing-pikachu";

/** learnMethod → 한국어 표기 매핑 */
export const LEARN_METHOD_KOR: Record<LearnMethod, string> = {
  "level-up": "레벨업",
  machine: "기술머신",
  egg: "교배",
  tutor: "기술가르침",
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
// 기술(Move) 관련 타입
// ─────────────────────────────────────────

/**
 * GET /api/moves/search?q=펀치
 * 기술 국문명 검색 드롭다운용 간략 정보
 */
export interface MoveSearchItem {
  id: number;
  koreanName: string;
  korType: string; // TB_TYPES.koreanName
}

export type MoveSearchResponse = MoveSearchItem[];

/**
 * GET /api/moves/[id]/brief
 * 기술 바구니에 표시할 간략 정보
 */
export interface MoveBrief {
  id: number;
  koreanName: string;
  korType: string;
  power: number | null;
  accuracy: number | null;
  damageClass: DamageClass;
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
 * GET /api/moves/[id]/learning-pokemons?gen=9
 * 기술 상세 페이지 하단: 특정 세대에서 해당 기술을 배우는 포켓몬 목록
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
 * 기술 목록은 아래 별도 쿼리로 분리 >> GET /api/pokemons/[id]/moves?gen=9
 */
export interface PokemonDetail {
  pokemonId: number;
  speciesId: number | null;
  koreanName: string;
  officialArtworkUrl: string | null;
  spriteUrl: string | null;
  evolutionChainUrl: string | null;
  korTypes: string[]; // 순서: slot 1, slot 2
  stats: StatEntry[];
  evStats: EvStatEntry[];
  abilities: PokemonAbilityInfo[];
}

/**
 * GET /api/pokemons/[id]/moves?gen=9
 * 포켓몬 상세 페이지 하단: 특정 세대에서 해당 포켓몬이 배우는 기술 목록
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
 * POST /api/search-learning-pokemons
 * Request body
 */
export interface SearchLearningPokemonsRequest {
  /** 기술 바구니에 담긴 기술 id 배열 (1개 이상) */
  moveIds: number[];
  /** 검색 대상 세대 번호 (1~9) */
  genNumber: number;
}

/**
 * POST /api/search-learning-pokemons 응답 — 개별 포켓몬 항목
 * moveLearnInfo: { [moveId]: 해당 세대에서의 학습 방법 목록 }
 */
export interface LearningPokemonItem {
  pokemonId: number;
  koreanName: string;
  spriteUrl: string | null;
  korTypes: string[];
  stats: StatEntry[];
  evStats: EvStatEntry[];
  /** key: moveId(number를 string으로 직렬화), value: 해당 세대에서의 학습방법 목록 */
  moveLearnInfo: Record<string, MoveLearnEntry[]>;
}

export type SearchLearningPokemonsResponse = LearningPokemonItem[];

// ─────────────────────────────────────────
// API 공통 에러 응답 타입
// ─────────────────────────────────────────
export interface ApiErrorResponse {
  error: string;
}
