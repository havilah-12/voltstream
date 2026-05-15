import { createContext, useContext, useMemo, useRef, useState } from "react";
import { askChatBot, askQaBot } from "../../api/chatApi";
import { assistantModes, getMemoryLabel, modeConfig } from "./assistantConstants";

const AssistantContext = createContext(null);

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
  const abortControllers = useRef({
    [assistantModes.chat]: null,
    [assistantModes.qa]: null,
  });

  const buildChatMemory = (mode) => {
    const topicMap = new Map();
    modeState[mode].messages.forEach((message, index) => {
      if (message.role !== "user") return;
      topicMap.set(getMemoryLabel(message.text), index);
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
      const botLabel = modeConfig[modeOverride].label;
      setModeState((current) => ({
        ...current,
        [modeOverride]: {
          ...current[modeOverride],
          loading: false,
          error: err.message || "Unable to reach the assistant.",
          messages: [
            ...current[modeOverride].messages,
            {
              role: "assistant",
              text: `I could not reach the ${botLabel} right now. Please check whether the backend is running and redeployed.`,
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
