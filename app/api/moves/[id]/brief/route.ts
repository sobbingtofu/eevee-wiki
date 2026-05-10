/**
 * GET /api/moves/[id]/brief
 *
 * - 특정 기술의 간략 정보 반환
 * - 기술 배우는 포켓몬 검색 시, 기술 바구니 UI 내 기술 데이터 표시용
 *
 * @param id - 기술 id (경로 파라미터)
 * @returns MoveBrief - { id, koreanName, korType, power, accuracy, damageClass }
 */
import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {fetchTypeMap} from "@/lib/supabase/queryHelpers";
import type {MoveBrief, ApiErrorResponse, DamageClass} from "@/types/apiTypes";
import {pokemonTypeKor} from "@/types/pokemonDataType";

interface TB_MOVE_USED_COLUMNS {
  id: number;
  korName: string | null;
  typeId: number | null;
  power: number | null;
  accuracy: number | null;
  damageClass: DamageClass | null;
  korDescription: string | null;
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id: rawId} = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json<ApiErrorResponse>({error: "유효하지 않은 기술 ID입니다."}, {status: 400});
  }

  // Step 1: 기술 기본 정보 조회
  const {data: move, error: moveErr} = await supabaseServer
    .from("TB_MOVES")
    .select("id, korName, typeId, power, accuracy, damageClass, korDescription")
    .eq("id", id)
    .maybeSingle();

  if (moveErr) {
    console.error("[moves/brief] TB_MOVES 조회 오류:", moveErr.message);
    return NextResponse.json<ApiErrorResponse>({error: "기술 정보 조회 중 오류가 발생했습니다."}, {status: 500});
  }

  if (!move) {
    return NextResponse.json<ApiErrorResponse>({error: `ID ${id}에 해당하는 기술을 찾을 수 없습니다.`}, {status: 404});
  }

  const m = move as TB_MOVE_USED_COLUMNS;

  // Step 2: typeId → 한국어 타입명 조회
  const typeMap = m.typeId != null ? await fetchTypeMap([m.typeId]) : new Map<number, pokemonTypeKor>();

  // Step 3: 응답 데이터 구성
  const result: MoveBrief = {
    id: m.id,
    koreanName: m.korName ?? m.id.toString(),
    korType: m.typeId != null ? (typeMap.get(m.typeId) ?? "???") : "???",
    power: m.power,
    accuracy: m.accuracy,
    damageClass: m.damageClass ?? "status",
    description: m.korDescription ?? "",
  };

  return NextResponse.json<MoveBrief>(result);
}
