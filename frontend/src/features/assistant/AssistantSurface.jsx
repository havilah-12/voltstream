import { useEffect, useRef, useState } from "react";
import { BotMessageSquare, Brain, MessageCircleMore, Send, Sparkles, Square, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAssistant } from "./AssistantContext";
import { assistantModes } from "./assistantConstants";

// Shared message renderer for both bot modes, with a tiny inline bold parser for guided answers.
function renderInlineFormatting(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return (
        <strong key={`${keyPrefix}-bold-${index}`} className="font-bold text-white">
          {match[1]}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function MessageBody({ text }) {
  const lines = String(text).split("\n").filter((line, index, array) => line.trim() !== "" || (index > 0 && array[index - 1].trim() !== ""));
  const hasBullets = lines.some((line) => line.trim().startsWith("* "));

  if (!hasBullets) {
    return (
      <div className="space-y-2">
        {lines.map((line, index) => (
          <p key={`line-${index}`} className="leading-6">
            {renderInlineFormatting(line, `line-${index}`)}
          </p>
        ))}
      </div>
    );
  }

  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
    } else {
      flushList();
      blocks.push({ type: "paragraph", text: line });
    }
  });
  flushList();

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`list-${index}-${itemIndex}`} className="list-disc leading-6">
                  {renderInlineFormatting(item, `list-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="leading-6">
            {renderInlineFormatting(block.text, `paragraph-${index}`)}
          </p>
        );
      })}
    </div>
  );
}

function ModeSwitch({ compact = false }) {
  const { activeMode, setActiveMode, modeConfig } = useAssistant();
  return (
    <div className={`flex rounded-2xl bg-zinc-900/50 p-1 ${compact ? "w-full" : ""}`}>
      {Object.values(assistantModes).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setActiveMode(mode)}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            activeMode === mode
              ? "bg-[var(--volt-yellow)] text-black"
              : "text-zinc-400 hover:text-[var(--volt-yellow)]"
          } ${compact ? "flex-1" : ""}`}
        >
          {modeConfig[mode].toggleLabel || modeConfig[mode].label}
        </button>
      ))}
    </div>
  );
}

export default function AssistantSurface({
  compact = false,
  showSidebar = true,
  showHeader = true,
  showModeSwitch = true,
  showPanelHeader = true,
  showCompactFooter = true,
  fixedMode = null,
  className = "",
}) {
  const { activeMode, modeConfig, modeState, setError, askQuestion, stopQuestion, getChatMemory, messageRefs, scrollToMessage, loadSession, startNewSession } =
    useAssistant();
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const effectiveMode = fixedMode ?? activeMode;
  const currentState = modeState[effectiveMode];
  const { messages, loading, error } = currentState;
  const config = modeConfig[effectiveMode];
  const chatMemory = getChatMemory(effectiveMode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, activeMode]);

  useEffect(() => {
    setQuestion("");
    setError("", effectiveMode);
  }, [effectiveMode]);

  const submitQuestion = async (nextQuestion = question) => {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion || loading) return;
    setQuestion("");
    await askQuestion(trimmedQuestion, [], effectiveMode);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion();
  };

  const shellClasses = compact
    ? "flex min-h-0 flex-1 flex-col"
    : "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]";

  const chatPanelClasses = compact
    ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl"
    : "flex h-[calc(100vh-220px)] min-h-[620px] flex-col rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl";
  const rootClasses = compact
    ? `flex h-full min-h-0 flex-col gap-3 ${className}`
    : `space-y-6 ${className}`;
  const inputWrapperClasses = compact
    ? "flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-zinc-800 bg-black px-3 focus-within:border-[var(--volt-yellow)]"
    : "flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-zinc-800 bg-black px-3 focus-within:border-[var(--volt-yellow)]";
  const inputClasses = compact
    ? "min-h-11 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[12px] placeholder:font-medium placeholder:text-zinc-600"
    : "min-h-12 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-600";
  const askButtonClasses = compact
    ? "flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] px-4 text-sm font-bold text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] px-5 font-bold text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={rootClasses}>
      {showHeader ? (
        <div data-tour="page-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">{config.title}</h1>
              <p className="max-w-3xl text-base font-medium text-zinc-400">{config.subtitle}</p>
            </div>
            {showModeSwitch ? <ModeSwitch /> : null}
          </div>
        </div>
      ) : showModeSwitch ? (
        <ModeSwitch compact />
      ) : null}

      <section className={shellClasses}>
        {/* Main conversation panel shared by Chat Bot and AI Assistant. */}
        <div data-tour="chat-panel" className={chatPanelClasses}>
          {showPanelHeader ? (
            <div className="border-b border-zinc-800 px-5 py-4">
              <div>
                <p className="font-display text-base font-semibold text-[var(--volt-yellow)]">{config.label}</p>
              </div>
            </div>
          ) : null}

          <div data-assistant-messages className="assistant-scrollbar min-h-0 flex-1 space-y-4 overflow-y-scroll px-5 py-5 pr-3">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={`${effectiveMode}-${message.role}-${index}`}
                  ref={(element) => {
                    if (element) {
                      messageRefs.current[effectiveMode][index] = element;
                    }
                  }}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                      <BotMessageSquare size={18} className="animate-[pulse_2s_ease-in-out_infinite]" />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
                      isUser
                        ? "bg-[var(--volt-yellow)] text-black"
                        : "border border-zinc-800 bg-black/35 text-zinc-100"
                    }`}
                  >
                    <MessageBody text={message.text} />
                    {message.role === "assistant" && message.sources?.length ? (
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--volt-yellow)]">
                        Based on the VoltStream guide
                      </p>
                    ) : null}
                  </div>
                  {isUser ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                      <UserRound size={18} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {loading ? (
              <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--volt-yellow)]" />
                {config.loadingText}
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {error ? (
            <div className="mx-5 mb-3 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className={inputWrapperClasses}>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={compact ? config.compactPlaceholder ?? config.placeholder : config.placeholder}
                  className={inputClasses}
                />
              </div>
              {loading ? (
                <button
                  type="button"
                  title="Stop"
                  onClick={() => stopQuestion(effectiveMode)}
                  className="flex min-h-12 w-12 items-center justify-center shrink-0 rounded-2xl bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  <div className="h-3.5 w-3.5 rounded-[2px] bg-currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className={askButtonClasses}
                >
                  <Send size={18} />
                  Ask
                </button>
              )}
            </div>
          </form>
        </div>

        {showSidebar ? (
          /* Sidebar switches its content from modeConfig, so "Try These" and Chat Memory adapt to the active bot. */
          <aside data-tour="chat-suggestions" className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="text-[var(--volt-yellow)]" size={22} />
                <h3 className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Try These</h3>
              </div>
              <div className="space-y-3">
                {config.suggestedQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submitQuestion(item)}
                    className="w-full rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-left text-sm font-semibold text-zinc-300 transition-colors hover:border-[var(--volt-yellow-border)] hover:text-[var(--volt-yellow)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="text-[var(--volt-yellow)]" size={22} />
                  <h3 className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Chat Sessions</h3>
                </div>
                <button
                  type="button"
                  onClick={() => startNewSession(effectiveMode)}
                  className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--volt-yellow)] transition-colors hover:text-white"
                >
                  + New
                </button>
              </div>
              {chatMemory.length > 0 ? (
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {chatMemory.map((item) => (
                    <button
                      key={`${effectiveMode}-${item.sessionId}`}
                      type="button"
                      onClick={() => loadSession(item.sessionId, effectiveMode)}
                      className="w-full rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-left transition-colors hover:border-[var(--volt-yellow-border)] hover:text-[var(--volt-yellow)]"
                    >
                      <p className="text-sm font-semibold leading-6 text-zinc-300">{item.topic}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold leading-6 text-zinc-500">{config.memoryEmptyText}</p>
              )}
            </div>
          </aside>
        ) : showCompactFooter ? (
          <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageCircleMore size={18} className="text-[var(--volt-yellow)]" />
                <p className="text-sm font-semibold text-zinc-300">{config.quickLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError("", effectiveMode);
                  navigate("/chat");
                }}
                className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--volt-yellow)] transition-colors hover:text-white"
              >
                Open full bot
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {config.suggestedQuestions.slice(0, 2).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submitQuestion(item)}
                  className="rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2 text-left text-xs font-semibold text-zinc-300 transition-colors hover:border-[var(--volt-yellow-border)] hover:text-[var(--volt-yellow)]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
