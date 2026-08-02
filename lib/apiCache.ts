/**
 * API 응답 브라우저 캐시 정책
 *
 * Next.js Route Handler는 기본이 no-store라, 명시하지 않으면 새로고침마다 서버까지 왕복하게 됨
 *
 * `public`을 쓸 수 있는 근거:
 *   이 프로젝트의 API는 전부 인증이 없고, 모든 사용자에게 같은 응답을 줌
 *
 */
export const API_CACHE_CONTROL = {
  /**
   * 버전 목록 — 화면 전체(드롭다운, 기본 선택값)가 여기에 매달려 있어 조금 짧게 잡았음
   * stale-while-revalidate로 만료 직후에도 즉시 응답하고 뒤에서 갱신함
   */
  VERSION_LIST: "public, max-age=300, stale-while-revalidate=3600",

  /** 기술·포켓몬 상세 — 동기화 전까지 불변이고, 한 시간 낡아도 지장이 없음 */
  DETAIL: "public, max-age=3600",

  /** 버전별 학습 목록 — 위와 성격이 같지만 응답이 커서 보수적으로 짧게 잡았음 */
  VERSION_SCOPED_LIST: "public, max-age=600",

  /** 검색 자동완성 — 타이핑 중 같은 검색어 재조회를 흡수할 만큼만 잡았음 */
  SEARCH: "public, max-age=60",
} as const;

/**
 * 성공 응답에만 붙이는 캐시 헤더.
 *
 * **에러 응답(4xx/5xx)에는 절대 붙이지 않고 기본값(no-store)로 둠**
 */
export function cacheHeaders(cacheControl: string) {
  return {headers: {"Cache-Control": cacheControl}};
}
