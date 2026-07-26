/**
 * GET /api/moves/search?q={검색어}
 *
 * koreanName에 검색어를 포함하는 기술 목록 반환 (드롭다운용)
 *
 * @param q - 국문 기술명 검색어 (예: "펀치")
 * @returns MoveSearchResponse - { id, koreanName, korType }[] (최대 20건)
 *
 * 드롭다운이 그리는 것만 담는다. 상세 정보는 항목을 고른 뒤
 * `/api/moves/[id]/brief`가 따로 가져온다 — 후보 20건이 아니라 고른 1건만 필요하므로.
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchTypeMap} from "@/lib/supabase/queryHelpers";
import type {MoveSearchResponse, ApiErrorResponse} from "@/types/apiTypes";

interface MoveRow {
  id: number;
  korName: string | null;
  typeId: number | null;
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  // 빈 검색어 → 빈 배열 반환 (에러 아님)
  if (!q) {
    return NextResponse.json<MoveSearchResponse>([]);
  }

  // ── Step 1: korName에 검색어 포함하는 기술 조회 ──────────────
  const {data: moves, error: movesErr} = await supabaseServer
    .from("TB_MOVES")
    .select("id, korName, typeId")
    .not("korName", "is", null)
    .ilike("korName", `%${q}%`)
    .order("korName")
    .limit(20);

  if (movesErr) {
    console.error("[moves/search] TB_MOVES 조회 오류:", movesErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "기술 검색 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!moves || moves.length === 0) {
    return NextResponse.json<MoveSearchResponse>([]);
  }

  // ── Step 2: typeId → 한국어 타입명 맵 조회 ────────────────────
  const typeIds = [...new Set((moves as MoveRow[]).map((m) => m.typeId).filter((id): id is number => id != null))];
  const typeMap = await fetchTypeMap(typeIds);

  // ── 응답 조립 ────────────────────────────────────────────────
  const result: MoveSearchResponse = (moves as MoveRow[])
    .filter((m): m is MoveRow & {korName: string} => m.korName != null)
    .map((m) => ({
      id: m.id,
      koreanName: m.korName,
      korType: m.typeId != null ? (typeMap.get(m.typeId) ?? "???") : "???",
    }));

  return NextResponse.json<MoveSearchResponse>(result);
}
