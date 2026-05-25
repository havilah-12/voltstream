// Assistant API calls for conversational chat and grounded Q&A.
import { apiRequest } from "./client";

export async function askChatBot(question, files, signal, requestOptions = {}) {
  return apiRequest("/chat", {
    method: "post",
    data: { question },
    signal,
    ...requestOptions,
  });
}

export async function askQaBot(question, files, signal, requestOptions = {}) {
  return apiRequest("/qa", {
    method: "post",
    data: { question },
    signal,
    ...requestOptions,
  });
}
