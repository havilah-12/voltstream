export const assistantModes = {
  chat: "chat",
  qa: "qa",
};

export const modeConfig = {
  [assistantModes.chat]: {
    label: "Chat Bot",
    title: "VoltStream Bot",
    subtitle: "Ask general questions about energy, solar savings, grid usage, and simple household energy terms.",
    placeholder: "What is the difference between kW and kWh?",
    loadingText: "Chat Bot is thinking...",
    memoryEmptyText: "I will summarize the main chat topics here.",
    quickLabel: "Quick Chat",
    suggestedQuestions: [
      "What can you help me with here?",
      "What is the difference between kW and kWh?",
      "How does solar reduce my bill?",
      "What is solar surplus?",
    ],
    initialMessages: [
      {
        role: "assistant",
        text: "Hello, I'm the VoltStream Bot. I can help with general energy questions, solar savings, grid usage, and simple energy terms. What would you like to know?",
        sources: [],
        attachments: [],
      },
    ],
  },
  [assistantModes.qa]: {
    label: "AI Assistant",
    title: "VoltStream AI Assistant",
    subtitle: "Ask about VoltStream pages, controls, billing details, and how the platform works.",
    placeholder: "Which page should I open to control devices?",
    loadingText: "AI Assistant is checking the VoltStream guide...",
    memoryEmptyText: "I will summarize the main grounded Q&A topics here.",
    quickLabel: "Quick Q&A",
    suggestedQuestions: [
      "Which page should I open to control devices?",
      "How do I check my bill savings?",
      "Explain the dashboard in simple terms.",
      "What does the Billing page show?",
    ],
    initialMessages: [
      {
        role: "assistant",
        text: "Hello, I'm the VoltStream AI Assistant. I answer platform-specific questions using the VoltStream guide. Ask me about pages, navigation, billing views, controls, or how VoltStream works.",
        sources: [],
        attachments: [],
      },
    ],
  },
};

export function getMemoryLabel(question) {
  const lowered = question.toLowerCase();
  if (lowered.includes("solar")) return "Solar and savings questions";
  if (lowered.includes("grid")) return "Grid power questions";
  if (lowered.includes("bill")) return "Billing questions";
  if (lowered.includes("device") || lowered.includes("appliance")) return "Device usage questions";
  if (lowered.includes("name") || lowered.includes("who are you")) return "Assistant identity questions";
  if (lowered.includes("how are you") || lowered === "hi" || lowered === "hello") return "General conversation";
  return "Platform help questions";
}

export const attachmentAccept = ".txt,.md,.csv,.json,.log,.pdf";
