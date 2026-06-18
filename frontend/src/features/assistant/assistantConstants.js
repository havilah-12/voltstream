export const assistantModes = {
  normal: "normal",
  rag: "rag",
};

export const modeConfig = {
  [assistantModes.normal]: {
    label: "VoltStream Chatbot",
    toggleLabel: "Chatbot",
    title: "VoltStream Chatbot",
    subtitle: "Ask about solar energy, grid energy, energy consumption, and sustainability.",
    placeholder: "How do solar panels work?",
    compactPlaceholder: "Ask general questions...",
    loadingText: "Bot is typing...",
    memoryEmptyText: "Topics are summarized here",
    quickLabel: "Quick Chat",
    suggestedQuestions: [
      "How do solar panels work?",
      "What is the difference between kW and kWh?",
      "What are the best ways to save energy at home?",
      "What are the benefits of a smart home?",
    ],
    initialMessages: [
      {
        role: "assistant",
        text: "Hello, I am the VoltStream Chatbot. I can answer general energy questions, but I don't have access to your personal data or the VoltStream guide. How can I help?",
        sources: [],
        attachments: [],
      },
    ],
  },
  [assistantModes.rag]: {
    label: "VoltStream AI Assistant",
    toggleLabel: "Assistant",
    title: "VoltStream AI Assistant",
    subtitle: "Ask about VoltStream pages, billing details, and how the platform works.",
    placeholder: "Which page should I open to control devices?",
    compactPlaceholder: "Ask about VoltStream...",
    loadingText: "Assistant is thinking...",
    memoryEmptyText: "Topics are summarized here",
    quickLabel: "Quick Chat",
    suggestedQuestions: [
      "Why is my electricity bill so high in summer?",
      "Which page should I open to control devices?",
      "How do I check my bill savings?",
      "Explain the dashboard in simple terms.",
    ],
    initialMessages: [
      {
        role: "assistant",
        text: "Hello, I'm the VoltStream AI Assistant. I can answer platform-specific questions about pages, navigation, billing, and controls using my embedded knowledge. How can I help?",
        sources: [],
        attachments: [],
      },
    ],
  },
};


export const attachmentAccept = ".txt,.md,.csv,.json,.log,.pdf";
