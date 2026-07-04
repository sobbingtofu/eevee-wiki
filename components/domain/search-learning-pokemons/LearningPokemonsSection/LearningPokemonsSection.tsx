"use client";

import {useMemo, useState} from "react";
import {useMutationState} from "@tanstack/react-query";
import {Loader} from "@/components/common-ui/Loader/Loader";
import {SEARCH_LEARNING_POKEMONS_MUTATION_KEY} from "@/queries/searchLearningPokemonsQueries";
import type {SearchLearningPokemonsResponse} from "@/types/apiTypes";

import SearchedMoveChip from "./SearchMoveChip/SearchMoveChip";
import LearningPokemonCard from "./LearningPokemonCard/LearningPokemonCard";

type SortOrder = "id" | "name";
type ViewMode = "gen" | "method";

/** 정렬/보기 세그먼트 토글 */
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: {value: T; label: string}[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-slate-800/60">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
            value === opt.value ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LearningPokemonsSection() {
  const [sortOrder, setSortOrder] = useState<SortOrder>("id");
  const [viewMode, setViewMode] = useState<ViewMode>("gen");

  // SearchBtn에서 실행한 검색 뮤테이션의 최신 상태/결과를 공유해 읽음
  const mutationStates = useMutationState({
    filters: {mutationKey: SEARCH_LEARNING_POKEMONS_MUTATION_KEY},
    select: (mutation) => ({
      status: mutation.state.status,
      data: mutation.state.data as SearchLearningPokemonsResponse | undefined,
    }),
  });
  const latest = mutationStates[mutationStates.length - 1];
  const status = latest?.status;
  const data = latest?.data;

  // 검색에 사용된 기술 id 목록 (모든 포켓몬이 동일한 키를 가지므로 첫 항목 기준)
  const moveIds = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0].moveLearnInfo).map(Number);
  }, [data]);

  // 정렬된 포켓몬 목록
  const sortedPokemons = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    if (sortOrder === "name") {
      arr.sort((a, b) => a.koreanName.localeCompare(b.koreanName, "ko"));
    } else {
      arr.sort((a, b) => a.pokemonId - b.pokemonId);
    }
    return arr;
  }, [data, sortOrder]);

  return (
    <div className="flex-1 h-full overflow-y-auto p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100">
            배우는 포켓몬 <span className="text-primary1">{data?.length || ""}</span>
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {moveIds.map((moveId) => (
              <SearchedMoveChip key={moveId} moveId={moveId} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <SegmentedToggle
            options={[
              {value: "id", label: "오름차순"},
              {value: "name", label: "가나다순"},
            ]}
            value={sortOrder}
            onChange={setSortOrder}
          />
          <SegmentedToggle
            options={[
              {value: "gen", label: "9세대"},
              {value: "method", label: "배우는 방법"},
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {/* 검색 진행 중 */}
      {status === "pending" && (
        <div className="flex-1 h-full flex items-center justify-center">
          <Loader />
        </div>
      )}

      {/* 검색 실패 */}
      {status === "error" && (
        <div className="flex-1 h-full flex items-center justify-center">
          <p className="text-sm text-red-400">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
        </div>
      )}

      {/* 검색 실행 전 */}
      {status !== "pending" && status !== "error" && !data && (
        <div className="flex-1 h-full flex items-center justify-center">
          <p className="text-sm text-slate-500">기술을 담고 &apos;배우는 포켓몬 검색&apos; 버튼을 눌러 주세요.</p>
        </div>
      )}

      {/* 결과 그리드 / 빈 결과 */}
      {data && sortedPokemons.length === 0 ? (
        <div className="w-full py-20 flex items-center justify-center">
          <p className="text-sm text-slate-500">조건을 모두 만족하는 포켓몬이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {sortedPokemons.map((pokemon) => (
            <LearningPokemonCard key={pokemon.pokemonId} pokemon={pokemon} moveIds={moveIds} />
          ))}
        </div>
      )}
    </div>
  );
}

export default LearningPokemonsSection;
