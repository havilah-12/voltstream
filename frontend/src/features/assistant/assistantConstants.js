export const assistantModes = {
  chat: "chat",
  qa: "qa",
};

// Mode-specific copy lives here so the shared assistant UI can switch between Chat Bot and AI Assistant cleanly.
export const modeConfig = {
  [assistantModes.chat]: {
    label: "Chat Bot",
    title: "VoltStream Bot",
    subtitle: "Ask general questions about energy, solar savings, grid usage, and simple household energy terms.",
    placeholder: "What is the difference between kW and kWh?",
    compactPlaceholder: "Ask about kW vs kWh...",
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
    compactPlaceholder: "Ask about a VoltStream page...",
    loadingText: "AI Assistant is thinking...",
    memoryEmptyText: "I will summarize the main grounded Q&A topics here.",
    quickLabel: "Quick Q&A",
    suggestedQuestions: [
      "Which page should I open to control devices?",
      "How do I check my bill savings?",
      "Explain the dashboard in simple terms.",
      "What will my estimated bill be next month after solar savings?",
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

// Chat Memory groups earlier user prompts into lightweight topics for quick jump-back links.
export function getMemoryLabel(question, mode = assistantModes.chat) {
  const lowered = question.toLowerCase();

  if (mode === assistantModes.chat) {
    if (lowered.includes("kw") || lowered.includes("kwh") || lowered.includes("term")) return "General energy terms";
    if (lowered.includes("solar")) return "Solar energy questions";
    if (lowered.includes("grid")) return "Grid power questions";
    if (lowered.includes("bill") || lowered.includes("saving")) return "Energy bill and savings questions";
    if (lowered.includes("device") || lowered.includes("appliance")) return "Home appliance energy questions";
    if (lowered.includes("name") || lowered.includes("who are you")) return "Chat bot identity questions";
    if (lowered.includes("how are you") || lowered === "hi" || lowered === "hello") return "General conversation";
    return "General energy questions";
  }

  if (lowered.includes("page") || lowered.includes("open") || lowered.includes("where")) return "Platform navigation questions";
  if (lowered.includes("bill") || lowered.includes("invoice") || lowered.includes("pay")) return "VoltStream billing questions";
  if (lowered.includes("device") || lowered.includes("appliance") || lowered.includes("control")) return "Smart Control questions";
  if (lowered.includes("dashboard") || lowered.includes("grid") || lowered.includes("solar")) return "Dashboard and energy data questions";
  if (lowered.includes("name") || lowered.includes("who are you")) return "Out-of-scope checks";
  return "VoltStream guide questions";
}

export const attachmentAccept = ".txt,.md,.csv,.json,.log,.pdf";
