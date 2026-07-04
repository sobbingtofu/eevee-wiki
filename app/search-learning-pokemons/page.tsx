import LearningPokemonsSection from "@/components/domain/search-learning-pokemons/LearningPokemonsSection/LearningPokemonsSection";
import MoveSearchBucketSection from "@/components/domain/search-learning-pokemons/MoveSearchBucketSection/MoveSearchBucketSection";

function SearchLearningPokemonsPage() {
  return (
    <div className="w-full h-full flex justify-start items-start md:flex-row flex-col">
      <MoveSearchBucketSection />
      <LearningPokemonsSection />
    </div>
  );
}

export default SearchLearningPokemonsPage;
