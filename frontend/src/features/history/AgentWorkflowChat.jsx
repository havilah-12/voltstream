import { useEffect, useRef, useState } from "react";
import { Bot, Network, Send, X, ShieldAlert, CheckCircle2, Cpu } from "lucide-react";
import { runOrchestratorAgent } from "../../api/orchestratorApi";

// Helper to format bold text and simple lists
function MessageBody({ text }) {
  if (!text) return null;
  const blocks = text.split(/(?:\r?\n){2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.trim().startsWith("* ") || block.trim().startsWith("- ")) {
          const items = block.split(/\r?\n/).filter((line) => line.trim().length > 0);
          return (
            <ul key={i} className="list-inside list-disc space-y-1 pl-1 marker:text-[var(--volt-yellow)]">
              {items.map((item, j) => {
                const cleanText = item.replace(/^[*-\s]+/, "");
                return (
                  <li key={j}>
                    <span dangerouslySetInnerHTML={{ __html: formatInline(cleanText) }} />
                  </li>
                );
              })}
            </ul>
          );
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(block) }} />;
      })}
    </div>
  );
}

function formatInline(text) {
  let html = text.replace(/^###\s+(.*)/gm, '<div class="text-base font-semibold text-[var(--volt-yellow)] mb-1 mt-2">$1</div>');
  html = html.replace(/^##\s+(.*)/gm, '<div class="text-base font-semibold text-[var(--volt-yellow)] mb-1 mt-3">$1</div>');
  html = html.replace(/^#\s+(.*)/gm, '<div class="text-base font-semibold text-[var(--volt-yellow)] mb-2 mt-4">$1</div>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--volt-yellow)]">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');
  html = html.replace(/`(.*?)`/g, '<code class="rounded bg-black/40 px-1 py-0.5 text-sm text-[var(--volt-yellow)]">$1</code>');
  return html;
}

function formatAgentName(name) {
  if (name === "analyst_agent" || name === "call_analyst_agent") return "Usage Details";
  if (name === "advisor_agent" || name === "call_advisor_agent") return "Saving Tips";
  if (name === "orchestrator_agent") return "Smart Advisor";
  if (name === "fetch_usage_history") return "History";
  if (name === "search_energy_knowledge_base") return "Knowledge Base";
  return name.replace(/_/g, " ");
}

export default function AgentWorkflowChat({ open, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      text: "Hi! I am the Smart Advisor. I analyze your past usage and give smart saving tips to help you lower your bill! Ask me a question like:\n\n- Show my last week electricity usage.\n- Give me energy-saving advice based on last week's usage.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const agentCacheRef = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTools]);

  useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort();
      setLoading(false);
      setActiveTools([]);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", text: trimmed }]);
    
    if (agentCacheRef.current[trimmed]) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", text: agentCacheRef.current[trimmed] },
      ]);
      return;
    }

    setLoading(true);
    setActiveTools([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let finalAnswer = "";

    try {
      await runOrchestratorAgent(trimmed, {
        session_id: sessionId,
        signal: controller.signal,
        onEvent: (parsed) => {
          if (parsed.event === "session") {
            setSessionId(parsed.data.session_id);
          } else if (parsed.event === "tool_call") {
            const toolName = formatAgentName(parsed.data.name);
            setActiveTools((prev) => [...prev, { id: Date.now().toString(), name: toolName, status: "running" }]);
          } else if (parsed.event === "tool_response") {
            const toolName = formatAgentName(parsed.data.name);
            setActiveTools((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].name === toolName && updated[i].status === "running") {
                  updated[i].status = "done";
                  break;
                }
              }
              return updated;
            });
          } else if (parsed.event === "answer") {
            finalAnswer = parsed.data.answer;
          }
        },
      });

      if (finalAnswer) {
        agentCacheRef.current[trimmed] = finalAnswer;
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", text: finalAnswer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", text: "Task completed successfully." },
        ]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", text: "Something went wrong. Please try again." },
        ]);
      }
    } finally {
      setLoading(false);
      setActiveTools([]);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-full max-h-[800px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)]">
              <Network size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-[var(--volt-yellow)]">Smart Advisor</h2>
              <p className="text-xs text-zinc-400">Your personal usage agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-[var(--volt-yellow)] text-black rounded-tr-sm"
                    : "border border-zinc-800 bg-zinc-900/80 text-zinc-300 rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mb-2 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                    <Network size={16} className="text-[var(--volt-yellow)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Smart Advisor
                    </span>
                  </div>
                )}
                <div className="text-sm leading-relaxed">
                  {msg.role === "assistant" ? <MessageBody text={msg.text} /> : msg.text}
                </div>
              </div>
            </div>
          ))}

          {/* Active Tools Display */}
          {activeTools.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] px-5 py-4 rounded-tl-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Cpu size={16} className="animate-pulse text-[var(--volt-yellow)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--volt-yellow)]">
                    Working on it
                  </span>
                </div>
                <div className="space-y-2">
                  {activeTools.map((tool) => (
                    <div key={tool.id} className="flex items-center gap-3 rounded-lg bg-black/40 px-3 py-2">
                      {tool.status === "running" ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-[var(--volt-yellow)]" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      )}
                      <span className="text-sm text-zinc-300">
                        {tool.status === "running" ? "Getting" : "Got"}{" "}
                        <strong className="font-medium text-white">{tool.name}</strong>...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generic Thinking Loader */}
          {loading && activeTools.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-5 py-4 border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] rounded-tl-sm flex items-center gap-3 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-[var(--volt-yellow)]">
                  <Bot size={16} className="animate-pulse" />
                </div>
                <span className="text-sm text-[var(--volt-yellow)] font-medium italic animate-pulse">Smart Advisor is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-800 bg-zinc-950 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 focus-within:border-[var(--volt-yellow-border)] focus-within:ring-1 focus-within:ring-[var(--volt-yellow-border)]"
          >
              <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Give me advice based on last week's usage.."
              className="max-h-[150px] min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              rows={1}
            />
            {loading ? (
              <button
                type="button"
                title="Stop"
                onClick={() => {
                  abortControllerRef.current?.abort();
                  setLoading(false);
                  setActiveTools([]);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                <div className="h-3.5 w-3.5 rounded-[2px] bg-currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--volt-yellow)] text-black transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send size={18} className="translate-x-[1px]" />
              </button>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
