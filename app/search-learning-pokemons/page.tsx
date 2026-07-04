import LearningPokemonsSection from "@/components/domain/search-learning-pokemons/LearningPokemonsSection/LearningPokemonsSection";
import MoveSearchBucketSection from "@/components/domain/search-learning-pokemons/MoveSearchBucketSection/MoveSearchBucketSection";
import {LearningSearchProvider} from "@/components/domain/search-learning-pokemons/context/LearningSearchContext";

function SearchLearningPokemonsPage() {
  return (
    <LearningSearchProvider>
      <div className="w-full h-full flex justify-start items-start md:flex-row flex-col">
        <MoveSearchBucketSection />
        <LearningPokemonsSection />
      </div>
    </LearningSearchProvider>
  );
}

export default SearchLearningPokemonsPage;
