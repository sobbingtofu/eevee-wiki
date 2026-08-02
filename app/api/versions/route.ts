/**
 * GET /api/versions
 *
 * 기술 학습 정보를 조회할 수 있는 게임 버전 목록 반환
 * 버전 선택 드롭다운의 옵션 소스
 *
 * - `TB_GEN_INFO.displayOrder IS NOT NULL` 인 22개만 반환
 *   (colosseum·xd·DLC·일본판·데이터 미제공 버전 제외)
 * - 정렬: displayOrder 내림차순 = 최신 버전 우선
 * - genNumber는 드롭다운 그룹 헤더 표기용이며 조회 조건이 아님
 * - learnMethods는 해당 버전에 실제 존재하는 "배우는 방법" 목록으로,
 *   UI의 배우는 방법 필터 옵션을 이 값으로 좁혀야 한다
 *
 * @returns VersionsResponse
 *          - { versionName, koreanName, genNumber, displayOrder, learnMethods }[]
 */
import {NextResponse} from "next/server";
import {fetchPlayableVersions} from "@/lib/supabase/queryHelpers";
import type {VersionsResponse, ApiErrorResponse} from "@/types/apiTypes";
import {API_CACHE_CONTROL, cacheHeaders} from "@/lib/apiCache";

export async function GET() {
  const versions = await fetchPlayableVersions();

  if (versions.length === 0) {
    console.error("[versions] 버전 목록이 비어 있습니다. TB_GEN_INFO.displayOrder를 확인하세요.");
    return NextResponse.json<ApiErrorResponse>({error: "버전 목록을 불러오지 못했습니다."}, {status: 500});
  }

  return NextResponse.json<VersionsResponse>(versions, cacheHeaders(API_CACHE_CONTROL.VERSION_LIST));
}
