/**
 * GET /api/moves/[id]/detail
 *
 * 특정 기술의 상세 정보 반환 (기술 상세 페이지용)
 *
 * @param id - 기술 id (경로 파라미터)
 * @returns MoveDetail - brief 정보 + korDescription, pp, effectChance, priority
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchTypeMap} from "@/lib/supabase/queryHelpers";
import type {MoveDetail, ApiErrorResponse, DamageClass} from "@/types/apiTypes";

interface MoveDetailRow {
  id: number;
  koreanName: string | null;
  typeId: number | null;
  power: number | null;
  accuracy: number | null;
  damageClass: DamageClass | null;
  korDescription: string | null;
  pp: number | null;
  effectChance: number | null;
  priority: number | null;
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id: rawId} = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json<ApiErrorResponse>({error: "유효하지 않은 기술 ID입니다."}, {status: 400});
  }

  // ── Step 1: 기술 전체 정보 조회 ─────────────────────────────
  const {data: move, error: moveErr} = await supabaseServer
    .from("TB_MOVES")
    .select("id, koreanName, typeId, power, accuracy, damageClass, korDescription, pp, effectChance, priority")
    .eq("id", id)
    .maybeSingle();

  if (moveErr) {
    console.error("[moves/detail] TB_MOVES 조회 오류:", moveErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "기술 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!move) {
    return NextResponse.json<ApiErrorResponse>({error: `ID ${id}에 해당하는 기술을 찾을 수 없습니다.`}, {status: 404});
  }

  const m = move as MoveDetailRow;

  // ── Step 2: typeId → 한국어 타입명 조회 ─────────────────────
  const typeMap = m.typeId != null ? await fetchTypeMap([m.typeId]) : new Map<number, string>();

  const result: MoveDetail = {
    id: m.id,
    koreanName: m.koreanName ?? m.id.toString(),
    korType: m.typeId != null ? (typeMap.get(m.typeId) ?? "???") : "???",
    power: m.power,
    accuracy: m.accuracy,
    damageClass: m.damageClass ?? "status",
    korDescription: m.korDescription,
    pp: m.pp,
    effectChance: m.effectChance,
    priority: m.priority ?? 0,
  };

  return NextResponse.json<MoveDetail>(result);
}
