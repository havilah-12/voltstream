import { Bot, CalendarClock, CheckCircle2, Send, X } from "lucide-react";
import { getTypeConfig } from "./deviceUtils";
import { getAgentResult } from "./agentUtils";

export default function DeviceAgent({
  agentOpen,
  agentMessage,
  agentEvents,
  agentLoading,
  agentError,
  agentChoice,
  agentSubmittedMessage,
  hideScheduleLoadingPanel,
  scheduleComposerOpen,
  scheduleTime,
  scheduleButtonEnabled,
  onMessageChange,
  onSubmit,
  onSchedule,
  onScheduleTimeChange,
  onDeviceChoice,
  onClose,
}) {
  const agentResult = getAgentResult(agentEvents, "", "device");

  const showLoadingCard = agentLoading && !hideScheduleLoadingPanel;
  const showResultCard = (agentResult.isDone || agentError) && !agentChoice;

  return (
    <>
      {/* Device Agent Button */}
      <button
        type="button"
        data-tour="device-agent"
        onClick={() => onClose()}
        className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40 hover:scale-[1.02]"
      >
        <Bot className="w-5 h-5" />
        Device Agent
      </button>

      {/* Agent Modal */}
      {agentOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Device Agent</h3>
                  <p className="text-sm text-zinc-400">Control devices with natural language</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Input Form */}
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    What would you like to do?
                  </label>
                  <textarea
                    value={agentMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    placeholder="Turn on the AC"
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!agentMessage.trim() || agentLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Run Now
                  </button>
                  <button
                    type="button"
                    onClick={onSchedule}
                    disabled={!scheduleButtonEnabled || agentLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-medium transition-colors"
                  >
                    <CalendarClock className="w-4 h-4" />
                    Schedule
                  </button>
                </div>
              </form>

              {/* Schedule Time Input */}
              {scheduleComposerOpen && (
                <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    When? (e.g., "in 10 secs", "at 11:55 AM")
                  </label>
                  <input
                    type="text"
                    value={scheduleTime}
                    onChange={(e) => onScheduleTimeChange(e.target.value)}
                    placeholder="in 10 secs"
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              {/* Loading Card */}
              {showLoadingCard && (
                <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-xl">
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${getTypeConfig(agentResult.deviceType).tone} flex items-center justify-center animate-pulse`}>
                      {(() => {
                        const Icon = getTypeConfig(agentResult.deviceType).icon;
                        return <Icon className="w-8 h-8 animate-spin" />;
                      })()}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">
                        {agentResult.action === "SCHEDULE_OFF" ? "Scheduling to turn off" : agentResult.action === "SCHEDULE_ON" ? "Scheduling to turn on" : agentResult.action === "OFF" ? "Turning off" : "Turning on"} {agentResult.loadingDeviceName}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">Please wait...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Device Choice */}
              {agentChoice && (
                <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-xl space-y-4">
                  <p className="text-white font-medium">
                    Multiple {agentChoice.type} devices found. Which one?
                  </p>
                  <div className="grid gap-2">
                    {agentChoice.devices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => onDeviceChoice(device)}
                        className="px-4 py-3 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left text-white transition-colors"
                      >
                        {device.name} {device.location && `- ${device.location}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Result Card */}
              {showResultCard && (
                <div className={`p-6 border rounded-xl ${agentError ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${agentError ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {agentError ? <X className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-medium ${agentError ? "text-red-400" : "text-emerald-400"}`}>
                        {agentError || (agentResult.isError ? agentResult.errorMessage : (agentResult.answerText || agentResult.errorMessage || "Action completed successfully"))}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
