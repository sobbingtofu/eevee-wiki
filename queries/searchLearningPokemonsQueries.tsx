import {useMutation} from "@tanstack/react-query";
import type {ApiErrorResponse, SearchLearningPokemonsRequest, SearchLearningPokemonsResponse} from "@/types/apiTypes";

/**
 * 기술 바구니에 담긴 복수의 기술을 특정 세대에서 모두 배우는 포켓몬 검색
 *
 * 반환 데이터 (각 포켓몬):
 *  - 기본 정보: pokemonId, koreanName, spriteUrl, korTypes
 *  - 스탯: stats (HP·공격·방어·특공·특방·스피드), evStats (노력치)
 *  - 기술별 학습 방법: moveLearnInfo[moveId] = [{ learnMethod, levelLearnedAt, versionName }]
 *
 * @returns useMutation 훅 반환값
 *  - mutate(variables)       — 비동기 실행 (fire-and-forget)
 *  - mutateAsync(variables)  — Promise 반환, try/catch 사용 가능
 *  - data                    — 마지막 성공한 응답 데이터
 *  - isPending               — 요청 진행 중 여부
 *  - isError / error         — 에러 상태
 *  - reset()                 — 상태 초기화 (결과 비우기)
 *
 * @example
 * const { mutate, data = [], isPending, mutateAsync } = useSearchLearningPokemons();
 *
 * // mutate 사용 예시 (콜백 패턴)
 * <button onClick={() => mutate({ moveIds: [7, 9], genNumber: 9 })} disabled={isPending}>
 *   {isPending ? "검색 중..." : "배우는 포켓몬 검색"}
 * </button>
 *
 * // 또는 async/await 패턴
 * const handleSearch = async () => {
 *   const result = await mutateAsync({ moveIds: [7, 9], genNumber: 9 });
 *   console.log(result); // SearchLearningPokemonsResponse
 * };
 */
export function useSearchLearningPokemons() {
  return useMutation<SearchLearningPokemonsResponse, Error, SearchLearningPokemonsRequest>({
    mutationFn: async (body: SearchLearningPokemonsRequest) => {
      const res = await fetch("/api/search-learning-pokemons", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody: ApiErrorResponse = await res.json().catch(() => ({error: `HTTP ${res.status}`}));
        throw new Error(errBody.error);
      }

      return res.json() as Promise<SearchLearningPokemonsResponse>;
    },
  });
}
