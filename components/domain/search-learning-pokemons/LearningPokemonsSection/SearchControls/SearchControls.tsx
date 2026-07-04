"use client";

import {CheckboxDropdown} from "@/components/common-ui/Dropdown/CheckboxDropdown";
import {SelectDropdown} from "@/components/common-ui/Dropdown/SelectDropdown";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {
  LEARN_METHOD_FILTERS,
  LEARN_METHOD_KOR,
  POKEMON_SORT_KEYS,
  POKEMON_SORT_KEY_LABEL,
  SORT_DIRECTIONS,
  SORT_DIRECTION_LABEL,
} from "@/types/apiTypes";

// 컨트롤 옵션 목록 (렌더마다 재생성 방지 위해 모듈 스코프 상수)
const SORT_DIRECTION_OPTIONS = SORT_DIRECTIONS.map((d) => ({value: d, label: SORT_DIRECTION_LABEL[d]}));
const SORT_KEY_OPTIONS = POKEMON_SORT_KEYS.map((k) => ({value: k, label: POKEMON_SORT_KEY_LABEL[k]}));
const GEN_OPTIONS = Array.from({length: 9}, (_, i) => ({value: i + 1, label: `${i + 1}세대`}));
const LEARN_METHOD_OPTIONS = LEARN_METHOD_FILTERS.map((m) => ({value: m, label: LEARN_METHOD_KOR[m]}));

/**
 * 헤더의 정렬/필터 컨트롤 4종
 * - 모두 공유 컨텍스트에 바인딩되어 있어, 값 변경 시 queryKey가 바뀌며 즉시 재검색됨
 */
function SearchControls() {
  const {
    sortKey,
    sortDirection,
    genNumber,
    learnMethods,
    setSortKey,
    setSortDirection,
    setGenNumber,
    toggleLearnMethod,
  } = useLearningSearchContext();

  return (
    <div className="flex gap-3">
      <SelectDropdown options={SORT_DIRECTION_OPTIONS} value={sortDirection} onChange={setSortDirection} />
      <SelectDropdown options={SORT_KEY_OPTIONS} value={sortKey} onChange={setSortKey} />
      <SelectDropdown options={GEN_OPTIONS} value={genNumber} onChange={setGenNumber} />
      <CheckboxDropdown
        label="배우는 방법"
        options={LEARN_METHOD_OPTIONS}
        selected={learnMethods}
        onToggle={toggleLearnMethod}
      />
    </div>
  );
}

export default SearchControls;
