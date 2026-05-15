// Assistant API calls for conversational chat and grounded Q&A.
import { apiRequest } from "./client";

function buildAssistantPayload(question) {
  return { question };
}

export async function askChatBot(question, files = [], signal) {
  return apiRequest("/chat", {
    method: "post",
    data: buildAssistantPayload(question),
    signal,
  });
}

export async function askQaBot(question, files = [], signal) {
  return apiRequest("/qa", {
    method: "post",
    data: buildAssistantPayload(question),
    signal,
  });
}
