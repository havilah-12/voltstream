import { createContext, useContext, useMemo, useRef, useState } from "react";
import { askChatBot, askQaBot } from "../../api/chatApi";
import { assistantModes, getMemoryLabel, modeConfig } from "./assistantConstants";

const AssistantContext = createContext(null);

// Each bot mode keeps its own messages, loading state, and error state so toggling does not wipe the other side.
function buildInitialModeState() {
  return Object.fromEntries(
    Object.entries(modeConfig).map(([mode, config]) => [
      mode,
      {
        messages: [...config.initialMessages],
        loading: false,
        error: "",
      },
    ]),
  );
}

export function AssistantProvider({ children }) {
  const [activeMode, setActiveMode] = useState(assistantModes.chat);
  const [modeState, setModeState] = useState(buildInitialModeState);
  const messageRefs = useRef({
    [assistantModes.chat]: {},
    [assistantModes.qa]: {},
  });
  // Abort controllers let each mode stop its own in-flight response independently.
  const abortControllers = useRef({
    [assistantModes.chat]: null,
    [assistantModes.qa]: null,
  });

  // Chat Memory is derived from earlier user prompts rather than stored separately in the backend.
  const buildChatMemory = (mode) => {
    const topicMap = new Map();
    modeState[mode].messages.forEach((message, index) => {
      if (message.role !== "user") return;
      topicMap.set(getMemoryLabel(message.text, mode), index);
    });
    return Array.from(topicMap, ([topic, messageIndex]) => ({ topic, messageIndex })).slice(-4);
  };

  const currentState = modeState[activeMode];
  const chatMemory = useMemo(() => buildChatMemory(activeMode), [activeMode, modeState]);

  const setError = (nextError, modeOverride = activeMode) => {
    setModeState((current) => ({
      ...current,
      [modeOverride]: {
        ...current[modeOverride],
        error: nextError,
      },
    }));
  };

  const getFriendlyAssistantError = (modeOverride, err) => {
    const loweredMessage = String(err?.message ?? "").toLowerCase();
    const botLabel = modeConfig[modeOverride].label;

    if (loweredMessage.includes("timeout")) {
      return {
        bubble: `${botLabel} is taking a little longer than usual. Please try again in a moment.`,
        banner: `${botLabel} is taking longer than expected right now.`,
      };
    }

    if (loweredMessage.includes("network") || loweredMessage.includes("failed")) {
      return {
        bubble: `I could not reach the ${botLabel} right now. Please try again in a moment.`,
        banner: `${botLabel} is temporarily unavailable.`,
      };
    }

    return {
      bubble: `I could not complete that response right now. Please try again in a moment.`,
      banner: `${botLabel} is temporarily unavailable.`,
    };
  };

  const askQuestion = async (rawQuestion, files = [], modeOverride = activeMode, options = {}) => {
    const trimmedQuestion = rawQuestion.trim();
    if (!trimmedQuestion || modeState[modeOverride].loading) return;
    const { replaceFromIndex = null } = options;

    const attachmentNames = files.map((file) => file.name);
    const controller = new AbortController();
    abortControllers.current[modeOverride] = controller;

    setModeState((current) => {
      const baseMessages =
        replaceFromIndex === null ? current[modeOverride].messages : current[modeOverride].messages.slice(0, replaceFromIndex);

      return {
        ...current,
        [modeOverride]: {
          ...current[modeOverride],
          error: "",
          loading: true,
          messages: [
            ...baseMessages,
            {
              role: "user",
              text: trimmedQuestion,
              sources: [],
              attachments: attachmentNames,
              uploadedFiles: files,
            },
          ],
        },
      };
    });

    try {
      // The mode switch decides whether the shared UI calls the general chat endpoint or the grounded QA endpoint.
      const requestFn = modeOverride === assistantModes.qa ? askQaBot : askChatBot;
      const response = await requestFn(trimmedQuestion, files, controller.signal);
      setModeState((current) => ({
        ...current,
        [modeOverride]: {
          ...current[modeOverride],
          loading: false,
          messages: [
            ...current[modeOverride].messages,
            {
              role: "assistant",
              text: response.answer,
              sources: response.sources ?? [],
              attachments: [],
              usedGemini: response.used_gemini,
            },
          ],
        },
      }));
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") {
        setModeState((current) => ({
          ...current,
          [modeOverride]: {
            ...current[modeOverride],
            loading: false,
            error: "",
            messages: [
              ...current[modeOverride].messages,
              {
                role: "assistant",
                text: "Okay, I stopped that response.",
                sources: [],
                attachments: [],
              },
            ],
          },
        }));
        return;
      }
      const friendlyError = getFriendlyAssistantError(modeOverride, err);
      setModeState((current) => ({
        ...current,
        [modeOverride]: {
          ...current[modeOverride],
          loading: false,
          error: friendlyError.banner,
          messages: [
            ...current[modeOverride].messages,
            {
              role: "assistant",
              text: friendlyError.bubble,
              sources: [],
              attachments: [],
            },
          ],
        },
      }));
    } finally {
      abortControllers.current[modeOverride] = null;
    }
  };

  const stopQuestion = (modeOverride = activeMode) => {
    abortControllers.current[modeOverride]?.abort();
  };

  const scrollToMessage = (messageIndex, modeOverride = activeMode) => {
    messageRefs.current[modeOverride]?.[messageIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const value = useMemo(
    () => ({
      activeMode,
      setActiveMode,
      modeConfig,
      messages: currentState.messages,
      loading: currentState.loading,
      error: currentState.error,
      setError,
      askQuestion,
      stopQuestion,
      chatMemory,
      getChatMemory: buildChatMemory,
      modeState,
      messageRefs,
      scrollToMessage,
    }),
    [activeMode, currentState, chatMemory, modeState],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside AssistantProvider");
  return context;
}
