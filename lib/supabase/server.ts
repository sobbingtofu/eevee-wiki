/**
 * 서버 전용 Supabase 클라이언트
 *
 * - Next.js API Route Handler(app/api/...) 내에서만 사용
 * - Service Role Key를 사용하므로 절대 클라이언트 컴포넌트에 노출 금지
 * - autoRefreshToken / persistSession 비활성화: 서버는 세션 불필요
 */
import {createClient, SupabaseClient} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("환경변수 NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.");
}
if (!supabaseServiceRoleKey) {
  throw new Error("환경변수 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.");
}

export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
