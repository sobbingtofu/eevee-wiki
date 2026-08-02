import TypeChip from "@/components/common-ui/TypeChip/TypeChip";
import {STAT_META} from "@/store/constantStore";
import {LearningPokemonItem, MoveLearnEntry, StatEntry} from "@/types/apiTypes";
import {pokemonTypeKor} from "@/types/pokemonDataType";
import {formatLearnMethods} from "@/utils/pokemonDataUtils";

/**
 * 개별 포켓몬 카드
 *
 * `moveNames`는 그릴 기술의 id와 이름을 순서대로 담은 Map
 */
function LearningPokemonCard({pokemon, moveNames}: {pokemon: LearningPokemonItem; moveNames: Map<number, string>}) {
  const statMap: Partial<Record<StatEntry["statName"], number>> = {};
  for (const stat of pokemon.stats) {
    statMap[stat.statName] = stat.statValue;
  }

  return (
    <div className="flex flex-col p-2 sm:p-6 sm:rounded-3xl rounded-xl bg-slate-900/40 border border-slate-800">
      {/* 스프라이트 이미지 */}
      <div
        className="sm:w-full w-[100%] sm:aspect-square aspect-auto sm:h-auto h-[80px]
        sm:mb-5 mb-2.5 mx-auto sm:rounded-2xl rounded-lg bg-[#f5f0e6] flex items-center justify-center overflow-hidden"
      >
        {pokemon.spriteUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pokemon.spriteUrl} alt={pokemon.koreanName} className="w-4/5 h-4/5 object-contain" />
        ) : (
          <span className="text-slate-400 text-xs">이미지 없음</span>
        )}
      </div>

      {/* 이름 */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-100 text-center mb-1.5 sm:mb-3">{pokemon.koreanName}</h3>

      {/* 타입 */}
      <div className="flex justify-center gap-2 sm:mb-6 mb-3">
        {pokemon.korTypes.map((type) => (
          <TypeChip key={type} typeKor={type as pokemonTypeKor} />
        ))}
      </div>

      {/* 스탯 */}
      <div className="grid grid-cols-3 gap-x-1 sm:gap-x-2 sm:gap-y-4 gap-y-2 mb-2 sm:mb-5">
        {STAT_META.map((stat) => (
          <div key={stat.key} className="text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mb-1">{stat.label}</p>
            <p className="text-xs sm:text-base font-bold text-slate-100">{statMap[stat.key] ?? "-"}</p>
          </div>
        ))}
      </div>

      {/* 기술별 학습방법 */}
      <div className="flex flex-col gap-3 sm:pt-4 pt-1.5 border-t border-slate-800">
        {[...moveNames].map(([moveId, name]) => (
          <MoveLearningMethodsArea key={moveId} name={name} entries={pokemon.moveLearnInfo[String(moveId)] ?? []} />
        ))}
      </div>
    </div>
  );
}

export default LearningPokemonCard;

/** 카드 하단의 기술별 학습방법 행 */
function MoveLearningMethodsArea({name, entries}: {name: string; entries: MoveLearnEntry[]}) {
  return (
    <div>
      <p className="text-primary1 font-bold text-xs sm:text-sm">{name}</p>
      <p className="text-slate-400 text-[10px] sm:text-xs mt-1">{formatLearnMethods(entries)}</p>
    </div>
  );
}
