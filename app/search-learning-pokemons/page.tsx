import {Suspense} from "react";
import {Loader} from "@/components/common-ui/Loader/Loader";
import LearningPokemonsSection from "@/components/domain/search-learning-pokemons/LearningPokemonsSection/LearningPokemonsSection";
import MoveSearchBucketSection from "@/components/domain/search-learning-pokemons/MoveSearchBucketSection/MoveSearchBucketSection";
import {LearningSearchProvider} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";

function SearchLearningPokemonsPage() {
  return (
    // 검색 조건을 URL에서 읽으므로(useSearchParams) Suspense 경계가 필요함
    <Suspense fallback={<PageLoading />}>
      <LearningSearchProvider>
        <div className="w-full h-full flex justify-start items-start md:flex-row flex-col">
          <MoveSearchBucketSection />
          <LearningPokemonsSection />
        </div>
      </LearningSearchProvider>
    </Suspense>
  );
}

export default SearchLearningPokemonsPage;

function PageLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader />
    </div>
  );
}
