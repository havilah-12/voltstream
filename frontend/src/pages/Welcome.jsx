import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, Bot, ChevronLeft, ChevronRight, IndianRupee, Settings2, Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const INTRO_REVEAL_COUNT = 2;
const FEATURE_REVEAL_COUNT = 3;
const REVEAL_STAGGER_MS = 250;
const PHASE_HOLD_MS = 2500;

const nextSteps = [
  {
    title: "Live usage status",
    text: "Grid, solar, load, and savings live.",
    icon: Activity,
    iconClassName: "welcome-step-icon welcome-step-icon-grid",
  },
  {
    title: "Usage history",
    text: "Daily, weekly, and monthly patterns.",
    icon: BarChart3,
    iconClassName: "welcome-step-icon welcome-step-icon-bill",
  },
  {
    title: "AI assistant",
    text: "Ask energy questions in plain language.",
    icon: Bot,
    iconClassName: "welcome-step-icon welcome-step-icon-bot",
  },
  {
    title: "Device agent",
    text: "Control and schedule smart devices.",
    icon: Settings2,
    iconClassName: "welcome-step-icon welcome-step-icon-control",
  },
  {
    title: "Billing insights",
    text: "Bills, solar credit, and budget status.",
    icon: IndianRupee,
    iconClassName: "welcome-step-icon welcome-step-icon-bill",
  },
];

const tourStepTotal = nextSteps.length + 1;

function revealClass(visible, instant) {
  if (!visible) return "welcome-reveal-pending";
  return instant ? "welcome-reveal-shown" : "welcome-reveal-active";
}

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("thunder");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [revealInstant, setRevealInstant] = useState(false);

  // Transition States for 3D card deck effect
  const [displayedPhase, setDisplayedPhase] = useState("thunder");
  const [displayedFeatureIndex, setDisplayedFeatureIndex] = useState(0);
  const [transitionClass, setTransitionClass] = useState("card-animate-enter");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const enterPlatform = () => {
    navigate("/", { replace: true });
  };

  const revealMax = phase === "intro" ? INTRO_REVEAL_COUNT : FEATURE_REVEAL_COUNT;

  const triggerTransition = useCallback((nextPhase, nextFeatureIndex) => {
    setIsTransitioning(true);
    setTransitionClass("card-animate-exit");

    setTimeout(() => {
      setPhase(nextPhase);
      setFeatureIndex(nextFeatureIndex);
      setDisplayedPhase(nextPhase);
      setDisplayedFeatureIndex(nextFeatureIndex);
      setRevealStep(0);
      setRevealInstant(false);
      setTransitionClass("card-animate-enter");
      setIsTransitioning(false);
    }, 650);
  }, []);

  const advancePhase = useCallback(() => {
    let nextPhase = phase;
    let nextFeatureIndex = featureIndex;

    if (phase === "thunder") {
      nextPhase = "logo";
    } else if (phase === "logo") {
      nextPhase = "intro";
    } else if (phase === "intro") {
      nextFeatureIndex = 0;
      nextPhase = "feature";
    } else if (phase === "feature") {
      if (featureIndex < nextSteps.length - 1) {
        nextFeatureIndex = featureIndex + 1;
      } else {
        nextPhase = "final";
      }
    }

    triggerTransition(nextPhase, nextFeatureIndex);
  }, [phase, featureIndex, triggerTransition]);

  const handlePrev = () => {
    if (phase === "thunder" || phase === "logo" || isTransitioning) return;

    setIsAutoPlay(false);

    let nextPhase = phase;
    let nextFeatureIndex = featureIndex;

    if (phase === "final") {
      nextPhase = "feature";
      nextFeatureIndex = nextSteps.length - 1;
    } else if (phase === "feature") {
      if (featureIndex > 0) {
        nextFeatureIndex = featureIndex - 1;
      } else {
        nextPhase = "intro";
      }
    } else if (phase === "intro") {
      nextPhase = "logo";
    }

    triggerTransition(nextPhase, nextFeatureIndex);
  };

  useEffect(() => {
    if (phase === "thunder") {
      const timer = window.setTimeout(advancePhase, 1600);
      return () => window.clearTimeout(timer);
    }
    if (phase === "logo") {
      const timer = window.setTimeout(advancePhase, 1800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase, advancePhase]);

  useEffect(() => {
    if (isTransitioning) return undefined;
    if (phase !== "intro" && phase !== "feature") return undefined;

    const maxReveal = phase === "intro" ? INTRO_REVEAL_COUNT : FEATURE_REVEAL_COUNT;

    if (revealStep >= maxReveal) {
      if (!isAutoPlay) return undefined;
      const timer = window.setTimeout(advancePhase, PHASE_HOLD_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setRevealStep((step) => step + 1);
    }, REVEAL_STAGGER_MS);

    return () => window.clearTimeout(timer);
  }, [phase, featureIndex, revealStep, advancePhase, isTransitioning, isAutoPlay]);

  const handleArrow = () => {
    if (phase === "final" || isTransitioning) return;

    setIsAutoPlay(false);
    advancePhase();
  };

  const showArrow = phase !== "final";
  const arrowLabel = "Next";
  const showBackArrow = phase !== "thunder" && phase !== "logo";

  return (
    <main className="h-screen overflow-hidden bg-black px-4 py-6 text-white sm:px-8">
      <section className="relative mx-auto flex h-full max-w-6xl items-center justify-center">
        <div className="welcome-orbit absolute inset-0" />

        {showBackArrow && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={isTransitioning}
            className="welcome-side-arrow absolute left-0 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-[var(--volt-yellow-border)] bg-black/70 text-[var(--volt-yellow)] backdrop-blur transition-colors hover:bg-[var(--volt-yellow)] hover:text-black disabled:opacity-50 max-lg:left-2 max-sm:bottom-8 max-sm:left-1/2 max-sm:top-auto max-sm:-translate-x-[54px] max-sm:translate-y-0"
            aria-label="Previous step"
            title="Previous step"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {showArrow && (
          <button
            type="button"
            onClick={handleArrow}
            disabled={isTransitioning}
            className="welcome-side-arrow absolute right-0 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-[var(--volt-yellow-border)] bg-black/70 text-[var(--volt-yellow)] backdrop-blur transition-colors hover:bg-[var(--volt-yellow)] hover:text-black disabled:opacity-50 max-lg:right-2 max-sm:bottom-8 max-sm:right-1/2 max-sm:top-auto max-sm:translate-x-[54px] max-sm:translate-y-0"
            aria-label={arrowLabel}
            title={arrowLabel}
          >
            <ChevronRight size={22} />
          </button>
        )}

        {displayedPhase === "thunder" && (
          <div className={`welcome-stage-in welcome-thunder-stage absolute flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[var(--volt-yellow)] text-black shadow-[0_0_70px_rgba(234,179,8,0.32)] ${transitionClass}`}>
            <Zap size={58} />
          </div>
        )}

        {displayedPhase === "logo" && (
          <div className={`welcome-stage-in welcome-logo-stage absolute text-center ${transitionClass}`}>
            <p className="text-sm font-bold uppercase tracking-[0.42em] text-zinc-500">Welcome to</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-[var(--volt-yellow)] sm:text-6xl">VoltStream</h1>
          </div>
        )}

        {displayedPhase === "intro" && (
          <article className={`welcome-stage-in welcome-intro-card absolute w-full max-w-5xl rounded-3xl border border-[var(--volt-yellow-border)] bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),transparent_38%),#050505] p-7 shadow-2xl sm:p-10 ${transitionClass}`}>
            <div className={revealClass(revealStep >= 1, revealInstant)}>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[var(--volt-yellow)] text-black">
                  <Zap size={34} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">Welcome to VoltStream</p>
                  <h1 className="mt-1 font-display text-3xl font-bold text-[var(--volt-yellow)] sm:text-5xl">
                    Hi{user?.name ? `, ${user.name}` : ""}.
                  </h1>
                </div>
              </div>
            </div>
            <p
              className={`mt-10 max-w-3xl text-lg font-semibold leading-8 text-zinc-200 sm:text-xl sm:leading-10 ${revealClass(revealStep >= 2, revealInstant)}`}
            >
              Your dashboard is ready. Track power, solar, devices, and bills in one place.
            </p>
          </article>
        )}

        {displayedPhase === "feature" && (
          <article className={`welcome-stage-in welcome-feature-card absolute w-full max-w-3xl rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_36%),#050505] p-8 shadow-2xl sm:p-12 ${transitionClass}`}>
            {(() => {
              const item = nextSteps[displayedFeatureIndex];
              if (!item) return null;
              const Icon = item.icon;
              return (
                <>
                  <p className={`mb-3 text-sm font-bold uppercase tracking-[0.22em] text-zinc-500 ${revealClass(revealStep >= 1, revealInstant)}`}>
                    Feature {displayedFeatureIndex + 2} of {tourStepTotal}
                  </p>
                  <div className={`mb-6 flex items-center gap-4 sm:gap-5 ${revealClass(revealStep >= 2, revealInstant)}`}>
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)] sm:h-16 sm:w-16 sm:rounded-3xl ${item.iconClassName}`}
                    >
                      <Icon size={30} />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-white sm:text-4xl lg:text-5xl">
                      {item.title}
                    </h2>
                  </div>
                  <p className={`max-w-2xl text-lg font-semibold leading-8 text-zinc-400 sm:text-xl sm:leading-9 ${revealClass(revealStep >= 3, revealInstant)}`}>
                    {item.text}
                  </p>
                </>
              );
            })()}
          </article>
        )}

        {displayedPhase === "final" && (
          <article className={`welcome-stage-in welcome-final-card-static absolute w-full max-w-3xl rounded-3xl border border-[var(--volt-yellow-border)] bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.18),transparent_42%),#050505] p-8 text-center shadow-2xl sm:p-12 ${transitionClass}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--volt-yellow)] text-black">
              <Zap size={34} />
            </div>
            <h2 className="mt-8 font-display text-3xl font-bold text-[var(--volt-yellow)] sm:text-5xl">Dashboard ready.</h2>
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={enterPlatform}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] px-5 font-bold text-black transition-colors hover:brightness-110"
              >
                Let&apos;s get into platform
                <ChevronRight size={18} />
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
