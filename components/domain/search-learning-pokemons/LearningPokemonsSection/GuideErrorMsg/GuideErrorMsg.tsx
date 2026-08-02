interface GuideErrorMsgProps {
  children: React.ReactNode;
  tone?: "muted" | "error";
}

/** 결과 영역 중앙 안내 메시지 */
function GuideErrorMsg({children, tone = "muted"}: GuideErrorMsgProps) {
  return (
    <div className="w-full h-full min-h-[240px] flex items-start justify-center">
      <p className={`text-sm mt-[16vh] ${tone === "error" ? "text-red-400" : "text-slate-500"}`}>{children}</p>
    </div>
  );
}

export default GuideErrorMsg;
