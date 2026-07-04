"use client";

import {useSearchLearningPokemons} from "@/queries/searchLearningPokemonsQueries";
import {useMoveBucketContext} from "./context/MoveBucketContext";

interface SearchBtnProps {
  className?: string;
}

function SearchBtn({className}: SearchBtnProps) {
  const {moveBucketIds} = useMoveBucketContext();

  const {mutate: executeSearchLearningPokemons, isPending: isSearchPending} = useSearchLearningPokemons();

  return (
    <>
      <button
        type="button"
        onClick={() => executeSearchLearningPokemons({moveIds: moveBucketIds, genNumber: 9})}
        disabled={moveBucketIds.length === 0 || isSearchPending}
        className={`w-full bg-primary1 cursor-pointer hover:bg-blue-600 text-white font-bold text-sm
          py-4 rounded-xl transition-all duration-150 shadow-lg shadow-primary1/25 flex items-center justify-center gap-2 ${className}`}
      >
        기술들을 배우는 포켓몬 검색
      </button>
    </>
  );
}

export default SearchBtn;
