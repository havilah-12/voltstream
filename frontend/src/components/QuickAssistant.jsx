import { useState } from "react";
import { ArrowUpRight, Bot, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssistantSurface from "../features/assistant/AssistantSurface";
import { assistantModes } from "../features/assistant/assistantConstants";

export default function QuickAssistant() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const openFullAssistant = () => {
    navigate("/chat");
    setOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="flex h-[min(78vh,720px)] w-[min(90vw,380px)] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <h3 className="font-display text-base font-semibold text-white">Quick Assistant</h3>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--volt-yellow)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--volt-yellow)] shadow-[0_0_12px_rgba(234,179,8,0.75)]" />
                <span>Online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button
                  type="button"
                  onClick={openFullAssistant}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
                  aria-label="Open full assistant page"
                >
                  <ArrowUpRight size={16} />
                </button>
                <span className="volt-tooltip right-0 top-full mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  Open full assistant
                </span>
              </div>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Close assistant"
                >
                  <X size={16} />
                </button>
                <span className="volt-tooltip right-0 top-full mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  Close assistant
                </span>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <AssistantSurface
              compact
              showSidebar={false}
              showHeader={false}
              showModeSwitch={false}
              showPanelHeader={false}
              showCompactFooter={false}
              fixedMode={assistantModes.chat}
            />
          </div>
        </div>
      ) : null}

      {!open ? (
        <div className="relative ml-auto group">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="quick-assistant-trigger flex h-14 w-14 items-center justify-center rounded-full bg-[var(--volt-yellow)] text-black shadow-[0_18px_50px_rgba(241,189,0,0.3)] transition-transform hover:-translate-y-0.5"
            aria-label="Open quick assistant"
          >
            <Bot size={24} className="quick-assistant-trigger-icon" />
          </button>
          <span className="volt-tooltip right-0 top-full mt-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
            Open quick assistant
          </span>
        </div>
      ) : null}
    </div>
  );
}
