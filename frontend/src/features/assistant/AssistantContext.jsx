import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { askChatBot, askQaBot, fetchSessions, fetchSessionMessages } from "../../api/chatApi";
import { assistantModes, modeConfig } from "./assistantConstants";

const AssistantContext = createContext(null);

function buildInitialModeState() {
  return Object.fromEntries(
    Object.entries(modeConfig).map(([mode, config]) => [
      mode,
      {
        messages: [...config.initialMessages],
        loading: false,
        error: "",
        sessions: [],
        activeSessionId: null,
      },
    ]),
  );
}

export function AssistantProvider({ children }) {
  const [activeMode, setActiveMode] = useState(assistantModes.rag);
  const [modeState, setModeState] = useState(buildInitialModeState);
  const messageRefs = useRef({
    [assistantModes.normal]: {},
    [assistantModes.rag]: {},
  });
  const abortControllers = useRef({
    [assistantModes.normal]: null,
    [assistantModes.rag]: null,
  });

  // Fetch sessions on mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const [normalSessions, ragSessions] = await Promise.all([
          fetchSessions(assistantModes.normal),
          fetchSessions(assistantModes.rag),
        ]);
        
        setModeState((current) => ({
          ...current,
          [assistantModes.normal]: { ...current[assistantModes.normal], sessions: normalSessions },
          [assistantModes.rag]: { ...current[assistantModes.rag], sessions: ragSessions },
        }));
      } catch (err) {
        console.error("Failed to load sessions", err);
      }
    }
    loadSessions();
  }, []);

  const loadSession = async (sessionId, modeOverride = activeMode) => {
    try {
      setModeState(current => ({
        ...current,
        [modeOverride]: { ...current[modeOverride], loading: true, error: "" }
      }));
      const sessionData = await fetchSessionMessages(sessionId);
      
      setModeState(current => ({
        ...current,
        [modeOverride]: {
          ...current[modeOverride],
          messages: [...modeConfig[modeOverride].initialMessages, ...(sessionData.messages || [])],
          activeSessionId: sessionId,
          loading: false
        }
      }));
    } catch (err) {
      console.error(err);
      setError("Could not load that chat session.", modeOverride);
    }
  };

  const startNewSession = (modeOverride = activeMode) => {
    setModeState(current => ({
      ...current,
      [modeOverride]: {
        ...current[modeOverride],
        messages: [...modeConfig[modeOverride].initialMessages],
        activeSessionId: null,
        error: "",
        loading: false
      }
    }));
  };

  const currentState = modeState[activeMode];
  
  // Replace buildChatMemory with actual sessions
  const getChatMemory = (mode) => {
    return modeState[mode].sessions.map(s => ({
      topic: s.topic_label || "Chat Session",
      sessionId: s.session_id
    }));
  };
  const chatMemory = useMemo(() => getChatMemory(activeMode), [activeMode, modeState]);

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

    let currentSessionId = modeState[modeOverride].activeSessionId;
    let isNewSession = false;
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      isNewSession = true;
    }

    const attachmentNames = files.map((file) => file.name);
    const controller = new AbortController();
    abortControllers.current[modeOverride] = controller;

    setModeState((current) => ({
      ...current,
      [modeOverride]: {
        ...current[modeOverride],
        error: "",
        loading: true,
        activeSessionId: currentSessionId,
        messages: [
          ...current[modeOverride].messages,
          {
            role: "user",
            text: trimmedQuestion,
            sources: [],
            attachments: attachmentNames,
            uploadedFiles: files,
          },
        ],
      },
    }));

    try {
      const response = modeOverride === assistantModes.normal
        ? await askChatBot(trimmedQuestion, controller.signal, { sessionId: currentSessionId })
        : await askQaBot(trimmedQuestion, files, controller.signal, { sessionId: currentSessionId });
      
      setModeState((current) => {
        const nextState = {
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
        };
        
        // Optimistically add to sessions list if it's new
        if (isNewSession) {
          nextState[modeOverride].sessions = [
            { session_id: currentSessionId, topic_label: "New Chat", mode: modeOverride },
            ...nextState[modeOverride].sessions
          ];
        }
        return nextState;
      });
      
      // Async refresh sessions to get the true LLM-generated title
      if (isNewSession) {
        fetchSessions(modeOverride).then(sessions => {
          setModeState(curr => ({
            ...curr,
            [modeOverride]: { ...curr[modeOverride], sessions }
          }));
        }).catch(e => console.error(e));
      }

    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") {
        setModeState((current) => ({
          ...current,
          [modeOverride]: { ...current[modeOverride], loading: false },
        }));
        return;
      }
      setError("An error occurred.", modeOverride);
    } finally {
      abortControllers.current[modeOverride] = null;
    }
  };

  const stopQuestion = (modeOverride = activeMode) => {
    abortControllers.current[modeOverride]?.abort();
  };

  const scrollToMessage = (messageIndex, modeOverride = activeMode) => {
    messageRefs.current[modeOverride]?.[messageIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const value = {
    activeMode,
    setActiveMode,
    modeConfig,
    modeState,
    setError,
    askQuestion,
    stopQuestion,
    getChatMemory,
    messageRefs,
    scrollToMessage,
    loadSession,
    startNewSession
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside AssistantProvider");
  return context;
}
