import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Shared navigation steps that can be reused on pages where the full app shell is visible.
const commonSteps = [
  {
    target: "main-nav",
    title: "Navigation Bar",
    body: "Use these tabs to move between live status, usage history, device control, billing, and the assistant.",
  },
  {
    target: "user-menu",
    title: "Your Account",
    body: "Your user profile and logout action are here.",
  },
];

const pageIntroSteps = {
  "/": {
    target: "page-heading",
    title: "Dashboard Overview",
    subtitle: "Your live energy command centre",
    body: "This is your main dashboard. It includes the live energy status chart, current grid and solar power, bill savings, eco impact, usage by source, and top energy consumers. The Quick Assistant button in the bottom-right corner is available on every page whenever you need help.",
  },
  "/analytics": {
    target: "page-heading",
    title: "Usage History Overview",
    subtitle: "Understand your energy patterns over time",
    body: "This page shows historical grid and solar data so you can compare usage patterns over time. Switch between daily, weekly, and monthly views and use the Smart Advisor for a plain-language breakdown of what changed.",
  },
  "/devices": {
    target: "smart-control-heading",
    title: "Smart Control Overview",
    subtitle: "Manage every appliance from one place",
    body: "This page lets you monitor appliances, see running devices, and control selected units. You can also use the VoltStream Agent to turn devices on, off, or schedule them using plain language commands.",
  },
  "/billing": {
    target: "page-heading",
    title: "Billing Overview",
    subtitle: "Track your bill, savings, and budget",
    body: "This page explains your generated bill, payable amount, solar savings, and budget status. It also shows recent invoices you can download as PDFs.",
  },
  "/chat": {
    target: "page-heading",
    title: "Assistant Overview",
    subtitle: "Two AI modes, one conversation space",
    body: "This page gives you both a conversational Chat Bot and a guide-based Q&A Bot in one place. Use the toggle at the top to switch modes. The sidebar shows suggested questions and your chat memory so you can jump back to earlier topics.",
  },
};

const pageSteps = {
  "/": [
    {
      target: "dashboard-flow",
      title: "Today's Energy Flow",
      subtitle: "Live grid and solar comparison",
      body: "This chart compares grid power and solar power through the day. The dashed lines make both signals visible when they overlap.",
    },
    {
      target: "dashboard-metrics",
      title: "Live Metrics",
      subtitle: "Five key numbers at a glance",
      body: "These cards summarize the current grid draw, solar generation, energy balance, bill savings, and CO2 impact.",
    },
    {
      target: "dashboard-insights",
      title: "Usage And Device Insights",
      subtitle: "Source breakdown and top consumers",
      body: "This section shows grid versus solar usage in kWh and lists the devices consuming the most power.",
    },
    {
      target: "quick-assistant",
      title: "Quick Assistant",
      subtitle: "Help without leaving the page",
      body: "Tap this button any time to open a compact chat panel. Ask energy questions, get tips, or switch to the full assistant — all without navigating away.",
    },
  ],
  "/analytics": [
    {
      target: "history-filters",
      title: "Period Filters",
      subtitle: "Daily, weekly, and monthly views",
      body: "Switch between daily, weekly, and monthly views to compare usage over time.",
    },
    {
      target: "history-ai-summary",
      title: "Smart Advisor",
      subtitle: "Plain-language analysis on demand",
      body: "Ask the Smart Advisor when you want a quick explanation of what changed in this period, how savings look, and what to do next.",
    },
    {
      target: "history-summary",
      title: "History Summary",
      subtitle: "Key totals for the selected period",
      body: "These cards show total grid use, solar generated, solar coverage, and the peak grid period.",
    },
    {
      target: "history-chart",
      title: "Energy Chart",
      subtitle: "Grid vs solar across the period",
      body: "Compare grid energy and solar generation across the selected period.",
    },
  ],
  "/devices": [
    {
      target: "device-categories",
      title: "Device Categories",
      subtitle: "Browse appliances by group",
      body: "Switch between Daily Essentials, Climate Control, Home Appliances, and Electronics to find the devices you want to manage.",
    },
    {
      target: "device-seasonal-mode",
      title: "Seasonal Control",
      subtitle: "Manual and preset modes",
      openDropdown: true,
      body: "Use this menu to stay on Manual Control or apply presets like Summer Cooling, Winter Warm, or Energy Saving.",
    },
    {
      target: "device-add",
      title: "Add Device",
      subtitle: "Register a new appliance",
      body: "Tap Add Device to open the form and register a new appliance with its type, room, and power usage.",
    },
    {
      target: "device-agent",
      title: "Device Agent",
      subtitle: "Control devices with plain language",
      body: "Tap Device Agent to open the AI-powered control panel. Type commands like 'Turn off the AC' or 'Turn on the fan in 5 minutes' and the agent handles the rest.",
    },
    {
      target: "device-stats",
      title: "Device Status",
      subtitle: "Active count and current load",
      body: "These cards show how many devices are active and the current load in watts.",
    },
    {
      target: "device-list",
      title: "Device Cards",
      subtitle: "Per-device status and quick controls",
      body: "Each card shows running units, location, power usage, and quick controls to toggle, edit, or remove a device.",
    },
  ],
  "/billing": [
    {
      target: "billing-alert",
      title: "Budget Status",
      subtitle: "At-a-glance bill health",
      body: "This message quickly tells you whether solar savings or controlled grid usage is keeping the payable bill in budget.",
    },
    {
      target: "billing-generated-card",
      title: "Generated Bill Card",
      subtitle: "Total before solar savings",
      body: "This card shows the total bill generated so far for the current month.",
    },
    {
      target: "billing-generated-amount",
      title: "Generated Bill Amount",
      subtitle: "Pre-savings figure",
      body: "This amount is the bill before solar savings are applied.",
    },
    {
      target: "billing-split",
      title: "Grid And Solar Split",
      subtitle: "How solar reduced your bill",
      body: "This section separates grid usage from solar contribution so you can see how much solar lowered the bill.",
    },
    {
      target: "billing-payable-card",
      title: "Payable Bill Card",
      subtitle: "Net amount after savings",
      body: "This card shows the net bill after solar savings and budget checks.",
    },
    {
      target: "billing-payable-amount",
      title: "Payable Amount",
      subtitle: "What you actually owe",
      body: "This is the actual amount left to pay after subtracting solar savings.",
    },
    {
      target: "billing-budget-section",
      title: "Budget Usage",
      subtitle: "Used vs remaining this month",
      body: "This section shows how much of the monthly budget is already used and how much is still left.",
    },
    {
      target: "billing-payment-section",
      title: "Payment Timing",
      subtitle: "When the pay button opens",
      body: "This area tells you when payment opens and when the pay button becomes available.",
    },
    {
      target: "billing-invoices-card",
      title: "Recent Invoices",
      subtitle: "Download past bills as PDFs",
      body: "This card lists recent invoice records and gives a quick PDF download for each one.",
    },
  ],
  "/chat": [
    {
      target: "chat-panel",
      title: "Chat Area",
      subtitle: "Your conversation with the AI",
      body: "Type your question here. The toggle at the top switches between Chat Bot (conversational) and Q&A Bot (guide-based answers from the VoltStream knowledge base).",
    },
    {
      target: "chat-suggestions",
      title: "Suggested Questions And Memory",
      subtitle: "Quick prompts and past topics",
      body: "The sidebar shows ready-made prompts to try and a Chat Memory list of your previous topics. Click any memory entry to jump back to that point in the conversation.",
    },
  ],
};

// Keep the tour card close to the highlighted element while staying inside the viewport.
function getPlacement(rect) {
  const tooltipWidth = Math.min(420, window.innerWidth - 32);
  const tooltipHeight = 300;
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2),
    window.innerWidth - tooltipWidth - 16
  );
  const belowTop = rect.bottom + 18;
  const aboveTop = rect.top - tooltipHeight - 18;
  const sideTop = Math.min(
    Math.max(16, rect.top + rect.height / 2 - tooltipHeight / 2),
    window.innerHeight - tooltipHeight - 16
  );

  if (belowTop + tooltipHeight < window.innerHeight) {
    return { left, top: belowTop, width: tooltipWidth };
  }

  if (aboveTop > 16) {
    return { left, top: aboveTop, width: tooltipWidth };
  }

  const rightLeft = rect.right + 18;
  if (rightLeft + tooltipWidth < window.innerWidth) {
    return { left: rightLeft, top: sideTop, width: tooltipWidth };
  }

  const leftSide = rect.left - tooltipWidth - 18;
  if (leftSide > 16) {
    return { left: leftSide, top: sideTop, width: tooltipWidth };
  }

  return { left, top: Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, 16)), width: tooltipWidth };
}

export default function GuidedTour() {
  const { user, completePageTour, dismissTour } = useAuth();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const hasSeenCurrentPage = Boolean(user?.seenTours?.[location.pathname]);
  const isTourPending = user?.tourPending ?? (user?.hasSeenIntro === false);
  const shouldShow = Boolean(user && isTourPending && !hasSeenCurrentPage);
  const steps = useMemo(
    () => [
      pageIntroSteps[location.pathname] ?? pageIntroSteps["/"],
      ...(location.pathname === "/" ? commonSteps : []),
      ...(pageSteps[location.pathname] ?? pageSteps["/"]),
    ],
    [location.pathname]
  );
  const step = steps[stepIndex] ?? steps[0];

  useEffect(() => {
    setStepIndex(0);
  }, [location.pathname]);

  useEffect(() => {
    const detail = shouldShow && step ? { target: step.target, openDropdown: Boolean(step.openDropdown) } : { target: null, openDropdown: false };
    window.dispatchEvent(new CustomEvent("volt-guided-tour-step", { detail }));

    return () => {
      window.dispatchEvent(new CustomEvent("volt-guided-tour-step", { detail: { target: null, openDropdown: false } }));
    };
  }, [shouldShow, step]);

  useEffect(() => {
    if (!shouldShow || !step) return undefined;

    let frameId;
    let timeoutId;
    let dropdownTimeoutId;
    // Each step resolves a data-tour target from the page and redraws the highlight around it.
    const updateRect = () => {
      const target = document.querySelector(`[data-tour="${step.target}"]`);
      if (!target) {
        setTargetRect(null);
        return;
      }

      target.scrollIntoView({ behavior: stepIndex === 0 ? "auto" : "smooth", block: "center", inline: "center" });
      frameId = window.requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
        });
      });
    };

    updateRect();
    timeoutId = window.setTimeout(updateRect, stepIndex === 0 ? 40 : 120);
    if (step.openDropdown) {
      dropdownTimeoutId = window.setTimeout(updateRect, 180);
    }
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(dropdownTimeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [shouldShow, step, stepIndex]);

  if (!shouldShow || !step) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isPageOverview = step.target === "page-overview" || stepIndex === 0;
  const highlight = isPageOverview
    ? {
        top: 8,
        left: 8,
        width: viewportWidth - 16,
        height: viewportHeight - 16,
      }
    : targetRect
    ? (() => {
        const top = Math.max(8, targetRect.top - 8);
        const left = Math.max(8, targetRect.left - 8);
        const width = Math.min(viewportWidth - left - 8, targetRect.width + 16);
        const visibleBottom = Math.min(viewportHeight - 8, targetRect.bottom + 8);
        const height = Math.max(48, Math.min(targetRect.height + 16, visibleBottom - top));
        return { top, left, width, height };
      })()
    : {
        top: 120,
        left: 24,
        width: Math.min(viewportWidth - 48, 520),
        height: 160,
      };
  const overlayBlocks = [
    { top: 0, left: 0, width: viewportWidth, height: highlight.top },
    { top: highlight.top, left: 0, width: highlight.left, height: highlight.height },
    {
      top: highlight.top,
      left: highlight.left + highlight.width,
      width: Math.max(0, viewportWidth - highlight.left - highlight.width),
      height: highlight.height,
    },
    {
      top: highlight.top + highlight.height,
      left: 0,
      width: viewportWidth,
      height: Math.max(0, viewportHeight - highlight.top - highlight.height),
    },
  ];
  const placement = getPlacement({
    ...highlight,
    bottom: highlight.top + highlight.height,
    right: highlight.left + highlight.width,
  });

  const goNext = () => {
    if (stepIndex === steps.length - 1) {
      completePageTour(location.pathname);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      {overlayBlocks.map((block, index) => (
        <div
          key={`tour-mask-${index}`}
          className="fixed z-[1000] bg-black/76"
          style={block}
        />
      ))}
      <div
        className="pointer-events-none fixed z-[1010] rounded-2xl border-2 border-[var(--volt-yellow)] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_28px_rgba(234,179,8,0.48)] transition-all duration-300"
        style={highlight}
      />
      <section
        className="tour-card-enter fixed z-[1020] rounded-3xl border border-[var(--volt-yellow-border)] bg-zinc-950 p-5 text-white shadow-2xl"
        style={placement}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--volt-yellow)]">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 className="font-display text-xl font-bold text-white">{step.title}</h2>
            {step.subtitle ? (
              <p className="mt-0.5 text-sm font-semibold text-zinc-400">{step.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissTour(location.pathname)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Skip guided tour"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm font-semibold leading-6 text-zinc-300">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 px-4 text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={() => dismissTour(location.pathname)}
            className="h-10 rounded-xl px-4 text-sm font-bold text-zinc-400 transition-colors hover:text-white"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--volt-yellow)] px-4 text-sm font-bold text-black transition-colors hover:brightness-110"
          >
            {stepIndex === steps.length - 1 ? "Finish" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
