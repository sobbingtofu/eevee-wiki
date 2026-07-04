"use client";

import {useLearningSearchContext} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";
import {useMoveBucketContext} from "./context/MoveBucketContext";

interface SearchBtnProps {
  className?: string;
}

function SearchBtn({className}: SearchBtnProps) {
  const {moveBucketIds} = useMoveBucketContext();
  const {commitSearch} = useLearningSearchContext();

  return (
    <button
      type="button"
      onClick={() => commitSearch(moveBucketIds)}
      disabled={moveBucketIds.length === 0}
      className={`w-full bg-primary1 cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
        text-white font-bold text-sm py-4 rounded-xl transition-all duration-150 shadow-lg shadow-primary1/25
        flex items-center justify-center gap-2 ${className}`}
    >
      기술들을 배우는 포켓몬 검색
    </button>
  );
}

export default SearchBtn;
