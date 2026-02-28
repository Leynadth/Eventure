function Toast({ id, message, type = "info", onDismiss }) {
  const styles = {
    success: "bg-[#2e6b4e] text-white border-[#255a43] shadow-lg",
    error: "bg-red-600 text-white border-red-700 shadow-lg",
    info: "bg-slate-700 text-white border-slate-800 shadow-lg",
  };
  const style = styles[type] || styles.info;

  return (
    <div role="alert" className={"min-w-0 max-w-[min(28rem,calc(100vw-2rem))] w-full px-4 py-3 rounded-xl border " + style + " flex items-center justify-between gap-3"}>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button type="button" onClick={onDismiss} className="shrink-0 p-1 rounded-lg opacity-90 hover:opacity-100" aria-label="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

export default Toast;
