export const assistantModes = {
  unified: "unified",
};

export const modeConfig = {
  [assistantModes.unified]: {
    label: "VoltStream Assistant",
    title: "VoltStream Assistant",
    subtitle: "Ask about energy terms, VoltStream pages, billing details, and how the platform works.",
    placeholder: "Which page should I open to control devices?",
    compactPlaceholder: "Ask about VoltStream...",
    loadingText: "Assistant is thinking...",
    memoryEmptyText: "I will summarize the main chat topics here.",
    quickLabel: "Quick Chat",
    suggestedQuestions: [
      "What is the difference between kW and kWh?",
      "Which page should I open to control devices?",
      "How do I check my bill savings?",
      "Explain the dashboard in simple terms.",
    ],
    initialMessages: [
      {
        role: "assistant",
        text: "Hello, I'm the VoltStream Assistant. I can answer general energy questions, and platform-specific questions about pages, navigation, billing, and controls. How can I help?",
        sources: [],
        attachments: [],
      },
    ],
  },
};


export const attachmentAccept = ".txt,.md,.csv,.json,.log,.pdf";
