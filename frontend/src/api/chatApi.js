// Assistant API calls for conversational chat and grounded Q&A.
import { apiRequest } from "./client";



export async function askChatBot(question, signal, requestOptions = {}) {
  return apiRequest("/aibot/chat", {
    method: "post",
    data: { question, session_id: requestOptions.sessionId },
    signal,
    timeout: 60000,
  });
}

export async function askQaBot(question, files, signal, requestOptions = {}) {
  return apiRequest("/aibot/qa", {
    method: "post",
    data: { question, session_id: requestOptions.sessionId },
    signal,
    timeout: 60000,
  });
}

export async function fetchSessions(mode) {
  return apiRequest(`/chat-sessions?mode=${mode}`, { method: "get" });
}

export async function fetchSessionMessages(sessionId) {
  return apiRequest(`/chat-sessions/${sessionId}`, { method: "get" });
}
