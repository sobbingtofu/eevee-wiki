"use client";

import {useMemo} from "react";
import {CheckboxDropdown} from "@/components/common-ui/Dropdown/CheckboxDropdown";
import {SelectDropdown} from "@/components/common-ui/Dropdown/SelectDropdown";
import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {useVersions} from "@/queries/versionQueries";
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

interface SearchControlsProps {
  className?: string;
}

/**
 * 헤더의 정렬/필터 컨트롤 4종
 * - 모두 공유 컨텍스트에 바인딩되어 있어, 값 변경 시 queryKey가 바뀌며 즉시 재검색됨
 * - 버전 목록과 배우는 방법 옵션은 하드코딩이 아니라 서버 데이터로 구성된다
 */
function SearchControls({className}: SearchControlsProps) {
  const {
    sortKey,
    sortDirection,
    versionName,
    learnMethods,
    availableLearnMethods,
    setSortKey,
    setSortDirection,
    setVersionName,
    toggleLearnMethod,
  } = useLearningSearchContext();

  const {data: versions = []} = useVersions();

  // 세대는 그룹 헤더 표시용일 뿐, 조회 조건이 아니다
  const versionOptions = useMemo(
    () =>
      versions.map((v) => ({
        value: v.versionName,
        label: v.koreanName,
        group: `${v.genNumber}세대`,
      })),
    [versions],
  );

  // 선택한 버전에 실제로 존재하는 방법만 노출한다.
  // 전체 목록을 그대로 쓰면 "champions + 기술머신"처럼 반드시 0건인 조합을 고를 수 있다.
  // LEARN_METHOD_FILTERS 순서로 필터링해 버전이 바뀌어도 표시 순서가 흔들리지 않게 한다.
  const learnMethodOptions = useMemo(
    () =>
      LEARN_METHOD_FILTERS.filter((m) => availableLearnMethods.includes(m)).map((m) => ({
        value: m,
        label: LEARN_METHOD_KOR[m],
      })),
    [availableLearnMethods],
  );

  return (
    <div className={`flex gap-3 flex-col md:flex-row md:w-fit ${className}`}>
      <div className="flex gap-3">
        <SelectDropdown options={SORT_DIRECTION_OPTIONS} value={sortDirection} onChange={setSortDirection} />
        <SelectDropdown options={SORT_KEY_OPTIONS} value={sortKey} onChange={setSortKey} />
      </div>
      <div className="flex gap-3">
        <SelectDropdown options={versionOptions} value={versionName} onChange={setVersionName} />
        <CheckboxDropdown
          label="배우는 방법"
          options={learnMethodOptions}
          selected={learnMethods}
          onToggle={toggleLearnMethod}
        />
      </div>
    </div>
  );
}

export default SearchControls;
