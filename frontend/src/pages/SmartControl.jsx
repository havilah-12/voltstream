import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { runDeviceAgent } from "../api/agentApi";
import { createDevice, deleteDevice, fetchDevices, updateDevice, updateDeviceStatus } from "../api/devicesApi";
import VoltSelect from "../components/VoltSelect";
import ThemedTooltip from "../components/ThemedTooltip";
import PageHeader from "../components/PageHeader";
import { useNotifications } from "../features/notifications/notificationStore";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  Send,
  Trash2,
  X,
  Zap,
  Loader2,
  XCircle,
} from "lucide-react";

// Import extracted modules
import {
  deviceSections,
  emptyForm,
  seasonalModes,
  statusOptions,
} from "../features/devices/deviceConstants";

import {
  canonicalizeDeviceName,
  canonicalizeDeviceType,
  getDeviceLabel,
  getDeviceType,
  getPreferredSelections,
  getSavingStatus,
  getTypeConfig,
  normalizeType,
  normalizeTypeKey,
  withHouseholdDefaults,
  getMentionedDeviceType,
  messageSpecifiesDevice,
} from "../features/devices/deviceUtils";

import {
  canScheduleAgentMessage,
  getAgentAction,
  getAgentResult,
  getRequestedScheduleTimeText,
  getTimingPhrase,
  isAddDeviceRequest,
  normalizeScheduleTimeInput,
  parseScheduledFor,
} from "../features/devices/agentUtils";

export default function SmartControl() {
  const [devices, setDevices] = useState([]);
  const [selectedByType, setSelectedByType] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [seasonalMode, setSeasonalMode] = useState("manual");
  const [seasonalMenuOpen, setSeasonalMenuOpen] = useState(false);
  const [tourSeasonalOpen, setTourSeasonalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Daily Essentials");
  const [openUnitMenu, setOpenUnitMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [agentEvents, setAgentEvents] = useState([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState("");
  const [agentChoice, setAgentChoice] = useState(null);
  const [agentIntent, setAgentIntent] = useState("");
  const [agentTargetName, setAgentTargetName] = useState("device");
  const [agentTargetType, setAgentTargetType] = useState("");
  const [hideScheduleLoadingPanel, setHideScheduleLoadingPanel] = useState(false);
  const [scheduleComposerOpen, setScheduleComposerOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [agentSubmittedMessage, setAgentSubmittedMessage] = useState("");
  const agentRunIdRef = useRef(0);
  const dismissedAgentRunIdRef = useRef(0);
  const scheduledTimersRef = useRef([]);
  const mountedRef = useRef(true);
  const agentAbortControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onTourStep = (event) => {
      const { target, openDropdown } = event.detail ?? {};
      setTourSeasonalOpen(Boolean(openDropdown && target === "device-seasonal-mode"));
    };

    window.addEventListener("volt-guided-tour-step", onTourStep);
    return () => window.removeEventListener("volt-guided-tour-step", onTourStep);
  }, []);

  const agentResult = getAgentResult(agentEvents, agentIntent, agentTargetName, agentTargetType);
  const scheduleButtonEnabled = canScheduleAgentMessage(agentMessage);
  const { notify, markAllRead } = useNotifications();

  const loadDevices = () =>
    fetchDevices().then((result) => {
      const nextDevices = withHouseholdDefaults(result ?? []);
      setDevices(nextDevices);
      const preferredSelections = getPreferredSelections(nextDevices);
      setSelectedByType(
        Object.fromEntries(
          Object.entries(preferredSelections).map(([type, device]) => [type, device.id])
        )
      );
      return nextDevices;
    });

  useEffect(() => {
    loadDevices()
      .catch((err) => setError(err.message || "Unable to load devices."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => {
    scheduledTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    scheduledTimersRef.current = [];
  }, []);

  const prevLoadRef = useRef(0);
  useEffect(() => {
    if (devices.length === 0) return;
    const activeLoad = devices.reduce((sum, d) => d.status === "ON" ? sum + (Number(d.power_usage_w) || 0) : sum, 0);
    if (activeLoad > 3000 && prevLoadRef.current <= 3000 && prevLoadRef.current > 0) {
      notify({
        type: "warning",
        title: "High Load Alert",
        message: `Total active load has reached ${activeLoad}W. Consider turning off unused devices.`,
      });
    }
    prevLoadRef.current = activeLoad;
  }, [devices, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpenUnitMenu(null);
      setPendingDeleteId(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeCategory, page]);

  useEffect(() => {
    const closeOpenMenu = (event) => {
      if (!event.target.closest("[data-unit-menu]")) {
        setOpenUnitMenu(null);
      }
    };

    document.addEventListener("mousedown", closeOpenMenu);
    return () => document.removeEventListener("mousedown", closeOpenMenu);
  }, []);

  const queueScheduledNotification = (response) => {
    // Backend returns { name, scheduled_state, scheduled_for, ... } at the top level
    const deviceName = response?.name;
    if (!response?.scheduled_for || !deviceName || !response?.scheduled_state) return;

    const scheduledDate = parseScheduledFor(response.scheduled_for_iso ?? response.scheduled_for);
    if (!scheduledDate) return;

    const delayMs = Math.max(0, scheduledDate.getTime() - new Date().getTime());
    const scheduledState = String(response.scheduled_state).toLowerCase();
    const timerId = window.setTimeout(async () => {
      // Always notify — the backend has already updated the DB by now.
      notify({
        type: "success",
        title: `${deviceName} turned ${scheduledState}`,
        message: "Scheduled device action completed.",
      });
      // Only refresh the device list if the component is still mounted.
      if (mountedRef.current) {
        await loadDevices().catch((loadError) => {
          console.error(loadError);
        });
      }
      scheduledTimersRef.current = scheduledTimersRef.current.filter((id) => id !== timerId);
    }, delayMs);

    scheduledTimersRef.current = [...scheduledTimersRef.current, timerId];
  };

  const toggleDevice = async (id, currentStatus) => {
    const newStatus = currentStatus === "ON" ? "OFF" : "ON";
    
    // Optimistic update
    setDevices(prev => {
      const nextDevices = prev.map(d => d.id === id ? { ...d, status: newStatus } : d);
      const toggledDevice = nextDevices.find((device) => device.id === id);
      if (toggledDevice) {
        const type = getDeviceType(toggledDevice);
        const runningDevice = nextDevices.find(
          (device) => getDeviceType(device) === type && device.status === "ON"
        );
        setSelectedByType((selected) => ({
          ...selected,
          [type]: runningDevice?.id ?? toggledDevice.id,
        }));
      }
      return nextDevices;
    });
    
    try {
      await updateDeviceStatus(id, newStatus);
    } catch (error) {
      console.error(error);
      // Revert on error
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus } : d));
    }
  };

  const executeAgentMessage = async (message, intent = "", options = {}) => {
    if (!message.trim()) return;

    if (intent === "SCHEDULE") {
      options.hideLoadingPanel = true;
      options.isOptimisticSchedule = true;
      const action = getAgentAction(message) || "ON";
      const targetName = options.targetName ?? getMentionedDeviceType(message) ?? "device";
      notify({
        type: "success",
        title: "Action Completed",
        message: `${targetName} scheduled to turn ${action.toLowerCase()} successfully.`,
        silent: true,
      });
    }

    if (!options.hideLoadingPanel) {
      setAgentEvents([]);
      setAgentError("");
      setAgentIntent(intent);
      setAgentTargetName(options.targetName ?? getMentionedDeviceType(message) ?? "device");
      setAgentTargetType(options.targetType ?? getMentionedDeviceType(message) ?? "");
      setAgentLoading(true);
    }
    const runId = ++agentRunIdRef.current;
    setAgentSubmittedMessage(message);
    setHideScheduleLoadingPanel(Boolean(options.hideLoadingPanel));

    let localEvents = [];

    const payloadToRun = options.jsonPayload ? options.jsonPayload : message;

    try {
      agentAbortControllerRef.current = new AbortController();
      await runDeviceAgent(payloadToRun, {
        signal: agentAbortControllerRef.current.signal,
        onEvent: (agentEvent) => {
          if (agentRunIdRef.current !== runId) return;
          localEvents.push(agentEvent);
          if (dismissedAgentRunIdRef.current !== runId) {
            setAgentEvents((current) => [...current, agentEvent]);
          }
          if (agentEvent.event === "tool_call" && agentEvent.data?.name === "toggle_device") {
            const device_id = agentEvent.data.args?.device_id;
            const newStatus = agentEvent.data.args?.state;
            if (device_id && (newStatus === "ON" || newStatus === "OFF")) {
              setDevices((prev) => {
                const nextDevices = prev.map((d) => (d.id === device_id ? { ...d, status: newStatus } : d));
                const toggledDevice = nextDevices.find((device) => device.id === device_id);
                if (toggledDevice) {
                  const type = getDeviceType(toggledDevice);
                  const runningDevice = nextDevices.find(
                    (device) => getDeviceType(device) === type && device.status === "ON"
                  );
                  setSelectedByType((selected) => ({
                    ...selected,
                    [type]: runningDevice?.id ?? toggledDevice.id,
                  }));
                }
                return nextDevices;
              });
            }
          }
          if (agentEvent.event === "tool_response") {
            if (agentEvent.data?.name === "schedule_device") {
              queueScheduledNotification(agentEvent.data.response);
            }
          }
          if (agentEvent.event === "error") {
            setAgentError(agentEvent.data?.message ?? "The device agent is unavailable right now.");
          }
        },
      });
      await loadDevices();
      
      const result = getAgentResult(localEvents, intent, options.targetName ?? getMentionedDeviceType(message) ?? "device", options.targetType ?? "");
      console.log("Agent result:", result);
      console.log("Local events:", localEvents);
      
      if (result.isDone && !result.isError && !options.isOptimisticSchedule) {
        let finalText;
        
        if (result.errorMessage) {
          // Fix for "already ON/OFF": Extract the relevant message
          // Usually backend returns something like "AC 2 is already OFF."
          const match = result.errorMessage.match(/(?:The\s+)?(.*) is already (ON|OFF)\.?/i);
          if (match) {
            finalText = `${match[1]} was already ${match[2].toUpperCase()}`;
          } else {
            finalText = result.errorMessage;
          }
        } else {
          const finalAction = (result.action || intent || "").toUpperCase();
          finalText = `${result.finalDeviceName} IS TURNED ${finalAction} SUCCESSFULLY.`;
        }
        
        console.log("Final notification text:", finalText);
        notify({
          type: "success",
          title: "Action Completed",
          message: finalText,
          silent: true,
        });
      }
    } catch (err) {
      setAgentError(err.message || "Unable to run device agent.");
      // Revert optimistic update on error
      await loadDevices();
    } finally {
      if (dismissedAgentRunIdRef.current === runId) {
        dismissedAgentRunIdRef.current = 0;
      }
      setAgentLoading(false);
    }
  };

  const dispatchAgentMessage = async (trimmedMessage, intent = "", options = {}) => {
    if (!trimmedMessage) return;

    if (isAddDeviceRequest(trimmedMessage)) {
      setAgentEvents([]);
      setAgentChoice(null);
      setAgentIntent("");
      setAgentTargetName("device");
      setAgentSubmittedMessage("");
      setHideScheduleLoadingPanel(false);
      setAgentError("Use the Add Device button to add devices. This agent only turns devices on, off, or schedules them.");
      return;
    }

    const action = getAgentAction(trimmedMessage);
    const mentionedType = getMentionedDeviceType(trimmedMessage);
    const devicesForType = mentionedType
      ? devices.filter((device) => getDeviceType(device) === mentionedType)
      : [];

    let targetDevice = null;
    if (devicesForType.length === 1 && !messageSpecifiesDevice(trimmedMessage, devicesForType)) {
      targetDevice = devicesForType[0];
    } else if (devicesForType.length > 0) {
      const specifiedDevices = devicesForType.filter(d => messageSpecifiesDevice(trimmedMessage, [d]));
      if (specifiedDevices.length === 1) {
        targetDevice = specifiedDevices[0];
      }
    }

    const timingPhrase = getTimingPhrase(trimmedMessage);
    if (action && targetDevice) {
      if (targetDevice.status?.toUpperCase() === action) {
        setAgentEvents([{ event: "answer", data: { answer: `${canonicalizeDeviceName(targetDevice)} is already ${action}.` } }]);
        setAgentChoice(null);
        setAgentIntent(action);
        setAgentTargetName(canonicalizeDeviceName(targetDevice));
        setAgentTargetType(getDeviceType(targetDevice));
        setAgentLoading(false);
        setAgentMessage("");
        notify({
          type: "success",
          title: "Action Completed",
          message: `${canonicalizeDeviceName(targetDevice)} was already ${action.toUpperCase()}`,
          silent: true,
        });
        return;
      }
    }

    const isAll = trimmedMessage.toLowerCase().includes("all");
    if (action && !mentionedType && !isAll) {
      setAgentEvents([{ event: "answer", data: { answer: `Please tell me which device you would like to turn ${action.toLowerCase()}.` } }]);
      setAgentChoice(null);
      setAgentIntent(action);
      setAgentTargetName("device");
      setAgentTargetType("");
      setAgentLoading(false);
      setAgentMessage("");
      return;
    }

    if (!action || !mentionedType) {
      executeAgentMessage(trimmedMessage, intent, options);
      return;
    }

    if (action && mentionedType && devicesForType.length > 1 && !messageSpecifiesDevice(trimmedMessage, devicesForType)) {
      setAgentEvents([]);
      setAgentError("");
      setAgentIntent(intent);
      setAgentTargetName(mentionedType);
      setHideScheduleLoadingPanel(Boolean(options.hideLoadingPanel));
      setAgentChoice({
        action,
        type: mentionedType,
        devices: devicesForType,
        timingText: getTimingPhrase(trimmedMessage),
      });
      return;
    }

    await executeAgentMessage(trimmedMessage, intent, options);
  };

  const runAgent = async (event) => {
    event.preventDefault();
    setScheduleComposerOpen(false);
    const trimmedMessage = agentMessage.trim();
    
    const payloadJson = JSON.stringify({
      message: trimmedMessage,
      token: "client-placeholder-cert"
    });

    const isSchedule = !!getTimingPhrase(trimmedMessage);

    await dispatchAgentMessage(trimmedMessage, isSchedule ? "SCHEDULE" : getAgentAction(trimmedMessage), {
      hideLoadingPanel: false,
      targetName: getMentionedDeviceType(trimmedMessage) ?? "device",
      jsonPayload: payloadJson,
    });
  };

  const scheduleAgent = async () => {
    const trimmedMessage = agentMessage.trim();
    if (!trimmedMessage || !scheduleButtonEnabled) return;

    const timingPhrase = getTimingPhrase(trimmedMessage);
    if (!timingPhrase && !scheduleComposerOpen) {
      setScheduleComposerOpen(true);
      setAgentError("");
      return;
    }

    const normalizedScheduleTime = normalizeScheduleTimeInput(scheduleTime);
    if (!timingPhrase && !normalizedScheduleTime) {
      setAgentError("Add a schedule time, like in 10 secs or at 11:55 AM.");
      return;
    }

    const scheduledMessage = timingPhrase ? trimmedMessage : `${trimmedMessage} ${normalizedScheduleTime}`;
    setScheduleComposerOpen(false);
    setAgentError("");
    setScheduleTime("");
    
    const payloadJson = JSON.stringify({
      message: scheduledMessage,
      token: "client-placeholder-cert"
    });

    await dispatchAgentMessage(scheduledMessage, "SCHEDULE", {
      hideLoadingPanel: false,
      targetName: getMentionedDeviceType(trimmedMessage) ?? "device",
      jsonPayload: payloadJson,
    });
  };

  const runAgentForDevice = (device) => {
    const actionText = agentChoice?.action === "OFF" ? "Turn off" : "Turn on";
    const timingText = agentChoice?.timingText ? ` ${agentChoice.timingText}` : "";

    if (device.status?.toUpperCase() === agentChoice?.action) {
      setAgentEvents([{ event: "answer", data: { answer: `The ${canonicalizeDeviceName(device)} is already ${agentChoice.action}.` } }]);
      setAgentChoice(null);
      setAgentIntent(agentChoice.action);
      setAgentTargetName(canonicalizeDeviceName(device));
      setAgentTargetType(getDeviceType(device));
      setAgentLoading(false);
      return;
    }

    setAgentChoice(null);
    executeAgentMessage(`${actionText} ${device.id}${timingText}`, agentIntent, {
      hideLoadingPanel: false,
      targetName: canonicalizeDeviceName(device),
      targetType: getDeviceType(device),
    });
  };

  const clearAgentResult = () => {
    if (!agentLoading) {
      agentRunIdRef.current++;
    } else {
      dismissedAgentRunIdRef.current = agentRunIdRef.current;
    }
    setAgentOpen(false);
    setAgentEvents([]);
    setAgentError("");
    setAgentChoice(null);
    setAgentIntent("");
    setAgentTargetName("device");
    setAgentSubmittedMessage("");
    setHideScheduleLoadingPanel(false);
  };

  const beginAdd = (type = "AC") => {
    const normalizedType = canonicalizeDeviceType(type);
    const count = devices.filter((device) => getDeviceType(device) === normalizedType).length + 1;
    setEditingId("new");
    setForm({
      type: normalizedType,
      name: `${normalizedType} ${count}`,
      location: "",
      status: "OFF",
      power_usage_w: getTypeConfig(normalizedType).watts,
    });
  };

  const applySeasonalMode = async (modeKey) => {
    setSeasonalMode(modeKey);
    const mode = seasonalModes[modeKey];
    if (!mode || modeKey === "manual") return;

    const typeIndex = {};
    const nextDevices = devices.map((device) => {
      const normalizedType = normalizeType(getDeviceType(device));
      typeIndex[normalizedType] = (typeIndex[normalizedType] ?? 0) + 1;
      if (mode.allOn) return { ...device, status: "ON" };
      if (mode.allOff) return { ...device, status: "OFF" };
      if (modeKey === "saving") return { ...device, status: getSavingStatus(device, typeIndex) };
      if (mode.on?.includes(normalizedType)) return { ...device, status: "ON" };
      if (mode.off?.includes(normalizedType)) return { ...device, status: "OFF" };
      return device;
    });

    setDevices(nextDevices);

    const changedDevices = nextDevices.filter((device) => {
      const current = devices.find((item) => item.id === device.id);
      return current && current.status !== device.status;
    });

    const results = await Promise.allSettled(
      changedDevices.map((device) => updateDeviceStatus(device.id, device.status))
    );
    if (results.some((result) => result.status === "rejected")) {
      console.warn("Some seasonal mode device updates failed.");
    }
  };

  const beginEdit = (device) => {
    setEditingId(device.id);
    setPendingDeleteId(null);
    setForm({
      type: getDeviceType(device),
      name: device.name,
      location: device.location ?? "",
      status: device.status,
      power_usage_w: device.power_usage_w,
    });
  };

  const saveDevice = async (event) => {
    event.preventDefault();
    const canonicalType = canonicalizeDeviceType(form.type);
    const payload = {
      ...form,
      type: canonicalType,
      power_usage_w: Number(form.power_usage_w) || 0,
    };

    if (editingId === "new") {
      const created = await createDevice(payload);
      setDevices((prev) => [...prev, created]);
      setSelectedByType((prev) => ({ ...prev, [getDeviceType(created)]: created.id }));
      notify({
        type: "success",
        title: "Device added",
        message: `${canonicalizeDeviceName(created)} is now available in Smart Control.`,
      });
    } else {
      const updated = await updateDevice(editingId, payload);
      setDevices((prev) => prev.map((device) => (device.id === editingId ? updated : device)));
      setSelectedByType((prev) => ({ ...prev, [getDeviceType(updated)]: updated.id }));
      notify({
        type: "success",
        title: "Device updated",
        message: `${canonicalizeDeviceName(updated)} settings were saved.`,
      });
    }

    setEditingId(null);
  };

  const removeDevice = async (device) => {
    const previousDevices = devices;
    const nextDevices = previousDevices.filter((item) => item.id !== device.id);
    const deviceType = getDeviceType(device);

    setDevices(nextDevices);
    setOpenUnitMenu((current) => (current === deviceType ? null : current));
    setPendingDeleteId(null);
    setSelectedByType((prev) => {
      const next = { ...prev };
      const replacementSelection = nextDevices.find((item) => getDeviceType(item) === deviceType);
      if (next[deviceType] === device.id) {
        if (replacementSelection) {
          next[deviceType] = replacementSelection.id;
        } else {
          delete next[deviceType];
        }
      }
      return next;
    });
    if (editingId === device.id) setEditingId(null);

    try {
      await deleteDevice(device.id);
      notify({
        type: "success",
        title: "Device removed",
        message: `${canonicalizeDeviceName(device)} was removed from Smart Control.`,
      });
    } catch (deleteError) {
      console.error(deleteError);
      setDevices(previousDevices);
      setSelectedByType(
        Object.fromEntries(
          Object.entries(getPreferredSelections(previousDevices)).map(([type, selectedDevice]) => [
            type,
            selectedDevice.id,
          ])
        )
      );
      const message = deleteError.message || "Unable to remove device.";
      setError(message);
      notify({
        type: "error",
        title: "Device removal failed",
        message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--volt-yellow)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-600/40 bg-red-950/50 p-8 text-center text-red-200">
        <h2 className="text-2xl font-semibold mb-3">Device data unavailable</h2>
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  const activeCount = devices.filter(d => d.status === "ON").length;
  const totalPower = devices.filter(d => d.status === "ON").reduce((sum, d) => sum + d.power_usage_w, 0);
  const groupedDevices = devices.reduce((groups, device) => {
    const type = getDeviceType(device);
    if (!groups[type]) groups[type] = [];
    groups[type].push(device);
    return groups;
  }, {});
  const deviceGroups = Object.entries(groupedDevices);
  const usedSectionTypes = new Set(deviceSections.flatMap((section) => section.types));
  const sectionedDeviceGroups = [
    ...deviceSections.map((section) => ({
      ...section,
      groups: deviceGroups.filter(([type]) => section.types.includes(normalizeType(type))),
    })),
    {
      title: "Other Devices",
      helper: "Custom devices added by you",
      groups: deviceGroups.filter(([type]) => !usedSectionTypes.has(normalizeType(type))),
    },
  ].filter((section) => section.groups.length > 0);
  const selectedSection = sectionedDeviceGroups.find((section) => section.title === activeCategory) ?? sectionedDeviceGroups[0];
  const cardsPerPage = 6;
  const selectedGroups = selectedSection?.groups ?? [];
  const totalPages = Math.max(1, Math.ceil(selectedGroups.length / cardsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleGroups = selectedGroups.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const seasonalOptions = Object.entries(seasonalModes).map(([key, mode]) => ({
    value: key,
    label: mode.label,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Smart Control" subtitle="Manage your home appliances remotely" />

      {editingId && (
        <form onSubmit={saveDevice} className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-6">
          <input
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Device type"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Room / location"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            type="number"
            value={form.power_usage_w}
            onChange={(event) => setForm((prev) => ({ ...prev, power_usage_w: event.target.value }))}
            placeholder="Watts"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <VoltSelect
            value={form.status}
            onChange={(status) => setForm((prev) => ({ ...prev, status }))}
            options={statusOptions}
            ariaLabel="Device status"
            className="md:col-span-1"
            buttonClassName="h-full min-h-[48px] border-zinc-700 px-4 py-3"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-[var(--volt-yellow)] px-4 py-3 font-bold text-black">
              Save
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-700 px-4 py-3 font-bold text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="device-categories" className="bg-zinc-900 p-1 rounded-xl inline-flex border border-zinc-800 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
          {sectionedDeviceGroups.map((section) => (
            <button
              key={section.title}
              type="button"
              onClick={() => {
                setActiveCategory(section.title);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors shrink-0 ${
                selectedSection?.title === section.title
                  ? "bg-[var(--volt-yellow)] text-black shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
          <div data-tour="device-seasonal-mode" className="bg-zinc-900 p-1 rounded-xl inline-flex border border-zinc-800">
              <VoltSelect
                value={seasonalMode}
                onChange={applySeasonalMode}
                options={seasonalOptions}
                ariaLabel="Seasonal mode"
                title={seasonalModes[seasonalMode].helper}
                className="min-w-[220px]"
                buttonClassName="bg-transparent border-none text-sm font-bold text-zinc-300"
                open={tourSeasonalOpen || seasonalMenuOpen}
                onOpenChange={(next) => {
                  if (!tourSeasonalOpen) setSeasonalMenuOpen(next);
                }}
              />
            </div>
            <button
              type="button"
              data-tour="device-add"
              onClick={() => beginAdd()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#282410] px-4 text-sm font-bold text-[#FFD700] transition-colors hover:brightness-110"
            >
              <Plus size={18} /> Add Device
            </button>
          </div>
        </div>

        {/* NEW INLINE AGENT & STATS SECTION */}
        <div className="flex flex-col gap-4 xl:flex-row">
          <div data-tour="device-agent" className="flex-1 rounded-2xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 p-3 opacity-10 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12">
              <Bot size={180} />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-sm font-bold text-[var(--volt-yellow)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--volt-yellow)] text-black"><Bot size={16} className="animate-[pulse_2s_ease-in-out_infinite]" /></span>
                VoltStream Agent
              </h2>
              <form onSubmit={runAgent} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={agentMessage}
                  onChange={(event) => {
                    setAgentMessage(event.target.value);
                    setAgentChoice(null);
                    setAgentIntent("");
                    setAgentTargetName("device");
                    setAgentSubmittedMessage("");
                    setHideScheduleLoadingPanel(false);
                    setAgentError("");
                  }}
                  placeholder="Turn off the AC or schedule a device..."
                  className="min-h-[50px] flex-1 rounded-xl border border-[var(--volt-yellow-border)] bg-black/40 px-5 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-[var(--volt-yellow)]/50 focus:border-[var(--volt-yellow)] focus:bg-black/60 focus:shadow-[0_0_24px_rgba(234,179,8,0.15)]"
                />
                {agentLoading ? (
                  <button
                    type="button"
                    title="Stop"
                    onClick={() => {
                      agentAbortControllerRef.current?.abort();
                      setAgentLoading(false);
                      setAgentEvents([]);
                    }}
                    className="flex min-h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                  >
                    <div className="h-3.5 w-3.5 rounded-[2px] bg-currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!agentMessage.trim()}
                    className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[var(--volt-yellow)] px-6 text-sm font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_16px_rgba(234,179,8,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={18} />
                    Go
                  </button>
                )}
                <button
                  type="button"
                  onClick={scheduleAgent}
                  disabled={agentLoading || !scheduleButtonEnabled}
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[var(--volt-yellow-border)] bg-black/40 px-5 text-sm font-bold text-[var(--volt-yellow)] transition-all hover:bg-[var(--volt-yellow)] hover:text-black disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
                >
                  <CalendarClock size={18} />
                  Schedule
                </button>
              </form>

              {scheduleComposerOpen ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row max-w-md bg-black/30 p-2 rounded-xl border border-[var(--volt-yellow-border)]/50 backdrop-blur-sm">
                  <input
                    value={scheduleTime}
                    onChange={(event) => {
                      setScheduleTime(event.target.value);
                      setAgentError("");
                    }}
                    placeholder="e.g. in 10 secs, or at 11:55 AM"
                    className="min-h-[44px] flex-1 rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-[var(--volt-yellow)] outline-none placeholder:text-[var(--volt-yellow)]/30"
                  />
                  <button
                    type="button"
                    onClick={scheduleAgent}
                    disabled={agentLoading || !scheduleTime.trim()}
                    className="min-h-[44px] rounded-lg bg-[var(--volt-yellow)] px-5 text-sm font-bold text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Confirm Time
                  </button>
                </div>
              ) : null}


            </div>
          </div>

          <div data-tour="device-stats" className="flex gap-4 shrink-0 overflow-x-auto pb-2 xl:pb-0">
            <div className="flex flex-col justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-7 py-5 min-w-[170px] xl:min-w-[190px] shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-5 p-3 text-emerald-400 transition-transform duration-500 group-hover:scale-125"><CheckCircle2 size={64}/></div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 relative z-10">Active Devices</p>
              <p className="text-4xl font-display font-bold text-white tracking-tight relative z-10">{activeCount} <span className="text-lg text-zinc-600 font-medium">/ {devices.length}</span></p>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-7 py-5 min-w-[170px] xl:min-w-[190px] shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-5 p-3 text-[var(--volt-yellow)] transition-transform duration-500 group-hover:scale-125"><Zap size={64}/></div>
              <p className="text-xs text-[var(--volt-yellow)]/60 font-bold uppercase tracking-wider mb-2 relative z-10">Current Load</p>
              <p className="text-4xl font-display font-bold text-[var(--volt-yellow)] tracking-tight relative z-10">{totalPower} <span className="text-lg text-[var(--volt-yellow)]/60 font-medium">W</span></p>
            </div>
          </div>
        </div>

        {(agentChoice || agentError || (hideScheduleLoadingPanel ? agentResult.isDone : agentLoading || agentEvents.length > 0)) && createPortal((
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--volt-yellow-border)] bg-[#1a1810]/95 p-5 shadow-[0_16px_48px_-12px_rgba(234,179,8,0.3)] relative animate-in zoom-in-95 duration-200">
               {agentChoice ? (
                  <div>
                    <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--volt-yellow)] text-black font-extrabold">?</span> 
                      Which {agentChoice.type} should I {agentChoice.action === "OFF" ? "turn off" : "turn on"}
                      {agentChoice.timingText ? ` ${agentChoice.timingText}` : ""}?
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {agentChoice.devices.map((device) => {
                        const ChoiceIcon = getTypeConfig(getDeviceType(device)).icon;
                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => runAgentForDevice(device)}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--volt-yellow-border)] bg-black/40 px-3 py-2 text-left transition-all hover:bg-[var(--volt-yellow)] hover:text-black hover:scale-[1.02]"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/30">
                                <ChoiceIcon size={16} />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{canonicalizeDeviceName(device)}</span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {(() => {
                      const hasError = !!agentError || !!agentResult.isError;
                      const showAsDone = agentResult.isDone && !hasError;
                      
                      const IconComp = hasError 
                        ? XCircle 
                        : getTypeConfig(agentResult.deviceType ?? agentTargetType ?? "device").icon;

                      let finalText = agentResult.answerText;
                      const actualAction = (getAgentAction(agentSubmittedMessage || agentMessage) || agentIntent || "on").toLowerCase();
                      
                      if (hasError) {
                        finalText = agentError || agentResult.errorMessage || `Failed to turn ${actualAction} device.`;
                      } else if (showAsDone) {
                        if (agentResult.action === "SCHEDULE") {
                          const userTimeText = getRequestedScheduleTimeText(agentSubmittedMessage);
                          finalText = userTimeText
                            ? `${agentTargetName} scheduled to turn ${actualAction} ${userTimeText}.`
                            : `${agentTargetName} scheduled to turn ${actualAction}.`;
                        } else {
                          finalText = agentResult.answerText || agentResult.errorMessage || `${agentTargetName} turned ${actualAction} successfully.`;
                          // Add successfully if not present and not "already"
                          if (!finalText.toLowerCase().includes("successfully") && !finalText.toLowerCase().includes("already")) {
                            finalText = finalText.replace(/\.$/, "") + " successfully.";
                          }
                          const suffix = totalPower >= 1000 ? " Watch out devices!" : "";
                          if (suffix && !finalText.includes("already") && !finalText.includes("Watch out")) {
                            finalText = finalText + suffix;
                          }
                        }
                      }

                      return (
                        <>
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            showAsDone ? 'bg-[var(--volt-yellow)] text-black shadow-md' :
                            hasError ? 'bg-red-500/10 text-red-500' :
                            'bg-zinc-800 text-[var(--volt-yellow)]'
                          }`}>
                            <IconComp 
                              size={24} 
                              className={(!showAsDone && !hasError) ? "animate-spin" : ""} 
                              style={(!showAsDone && !hasError) ? { animationDuration: "2s" } : {}} 
                            />
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            {showAsDone || hasError ? (
                              <p className={`text-sm font-bold leading-tight ${hasError ? 'text-red-400' : 'text-white'}`}>
                                {finalText}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-[var(--volt-yellow)] opacity-90 tracking-wide animate-pulse">
                                {(() => {
                                  const actionText = agentIntent === "SCHEDULE" 
                                    ? `Scheduling to turn ${actualAction}` 
                                    : actualAction === "off" 
                                      ? "Turning off" 
                                      : actualAction === "on"
                                        ? "Turning on"
                                        : "Updating";
                                  return `${actionText} ${agentTargetName || "device"}...`;
                                })()}
                              </p>
                            )}
                          </div>
                          {(showAsDone || hasError) ? (
                            <button
                              type="button"
                              onClick={clearAgentResult}
                              className={`shrink-0 rounded-lg px-5 py-2 text-xs font-bold text-black transition-all hover:brightness-110 hover:shadow-lg ${agentResult.action === "SCHEDULE" ? "bg-amber-500" : "bg-[var(--volt-yellow)]"}`}
                            >
                              OK
                            </button>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                )}
            </div>
          </div>
        ), document.body)}

        {selectedSection ? (
          <section data-tour="device-list" className="rounded-2xl border border-zinc-900">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--volt-yellow)]">{selectedSection.title}</h2>
                <p className="text-sm text-zinc-500">{selectedSection.helper}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase text-zinc-600">
                  {selectedGroups.reduce((sum, [, group]) => sum + group.filter((item) => item.status === "ON").length, 0)} running
                </p>
                <div className="flex items-center gap-2">
                  <ThemedTooltip label="Previous">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={currentPage === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 hover:text-white"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </ThemedTooltip>
                  <span className="min-w-[58px] text-center text-xs font-bold text-zinc-500">
                    {currentPage} / {totalPages}
                  </span>
                  <ThemedTooltip label="Next">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={currentPage === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 hover:text-white"
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </ThemedTooltip>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleGroups.map(([type, group]) => {
                const selectedId = selectedByType[type] ?? group[0]?.id;
                const device = group.find((item) => item.id === selectedId) ?? group[0];
                const isOn = device.status === "ON";
                const toggleLabel = isOn ? "Turn off" : "Turn on";
                const runningCount = group.filter((item) => item.status === "ON").length;
                const runningDevices = group.filter((item) => item.status === "ON");
                const hasRunningUnit = runningCount > 0;
                const glowClass =
                  runningCount >= 3
                    ? "shadow-[0_0_34px_rgba(234,179,8,0.28)]"
                    : runningCount === 2
                      ? "shadow-[0_0_26px_rgba(234,179,8,0.22)]"
                      : runningCount === 1
                        ? "shadow-[0_0_18px_rgba(234,179,8,0.16)]"
                        : "shadow-sm";
                const overlayClass =
                  runningCount >= 3
                    ? "bg-[linear-gradient(135deg,rgba(234,179,8,0.16),rgba(234,179,8,0.06)_45%,transparent_72%)]"
                    : runningCount === 2
                      ? "bg-[linear-gradient(135deg,rgba(234,179,8,0.13),rgba(234,179,8,0.05)_45%,transparent_72%)]"
                      : "bg-[linear-gradient(135deg,rgba(234,179,8,0.10),rgba(234,179,8,0.03)_45%,transparent_70%)]";
                const config = getTypeConfig(type);
                const DeviceIcon = config.icon;

                return (
                  <div
                    key={type} 
                    className={`relative flex h-full min-h-[190px] flex-col rounded-2xl p-4 border transition-all duration-300 ${
                      openUnitMenu === type ? "z-40 overflow-visible" : "overflow-visible"
                    } ${
                      hasRunningUnit 
                        ? `bg-zinc-900 text-white border-[var(--volt-yellow-border)] ${glowClass} hover:-translate-y-2 hover:shadow-[0_0_44px_rgba(234,179,8,0.42)] hover:border-[var(--volt-yellow)] hover:scale-[1.01]` 
                        : 'bg-zinc-900 text-white border-zinc-800 shadow-sm hover:border-[var(--volt-yellow-border)] hover:-translate-y-2 hover:shadow-[0_16px_44px_rgba(0,0,0,0.55),0_0_24px_rgba(234,179,8,0.16)] hover:scale-[1.01]'
                    }`}
                  >
                    <div className="relative z-30 mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.tone}`}>
                          <DeviceIcon size={22} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-white">{type}</h3>
                          <p className="text-xs font-semibold text-zinc-500">{runningCount} / {group.length} running</p>
                        </div>
                      </div>
                      <ThemedTooltip
                        label={toggleLabel}
                        className="shrink-0"
                        tooltipClassName="right-0 left-auto top-full bottom-auto z-40 mt-2 mb-0 translate-x-0"
                      >
                        <button
                          onClick={() => toggleDevice(device.id, device.status)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                            isOn 
                              ? 'bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)] hover:bg-[rgba(234,179,8,0.22)]' 
                              : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                          }`}
                          aria-label={toggleLabel}
                        >
                          <Power size={21} className={isOn ? 'stroke-[2.5px]' : ''} />
                        </button>
                      </ThemedTooltip>
                    </div>

                    {group.length > 1 ? (
                      <div data-unit-menu className="relative z-10 mb-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenUnitMenu((current) => (current === type ? null : type));
                          }}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold outline-none transition-colors ${
                            hasRunningUnit
                              ? 'border-[var(--volt-yellow-border)] bg-black/35 text-white hover:border-[var(--volt-yellow)]'
                              : 'border-zinc-700 bg-zinc-950 text-white hover:border-[var(--volt-yellow-border)]'
                          }`}
                        >
                          <span className="truncate">{canonicalizeDeviceName(device)}</span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 ${hasRunningUnit ? 'text-[var(--volt-yellow)]' : 'text-zinc-500'}`}
                          />
                        </button>
                        {openUnitMenu === type && (
                          <div className="assistant-scrollbar absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[168px] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--volt-yellow-border)] bg-zinc-950 shadow-[0_24px_50px_rgba(0,0,0,0.6)] ring-1 ring-black/40">
                            {group.map((item) => {
                              const selected = item.id === device.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedByType((prev) => ({ ...prev, [type]: item.id }));
                                    setOpenUnitMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                                    selected
                                      ? "bg-[var(--volt-yellow)] text-black"
                                      : "text-white hover:bg-[var(--volt-yellow-soft)] hover:text-[var(--volt-yellow)]"
                                  }`}
                                >
                                  <p className="min-w-0 flex-1 truncate text-sm font-bold leading-6">
                                    {canonicalizeDeviceName(item)}
                                  </p>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                                      selected
                                        ? "bg-black/10 text-black/80"
                                        : item.status === "ON"
                                          ? "bg-emerald-500/15 text-emerald-300"
                                          : "bg-zinc-800 text-zinc-500"
                                    }`}
                                  >
                                    {item.status === "ON" ? "On" : "Off"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="relative z-10 mb-3 truncate rounded-xl border border-zinc-800 bg-black/20 px-3 py-2.5 text-sm font-semibold text-white">
                        {getDeviceLabel(device)}
                      </p>
                    )}

                    {group.length > 1 ? (
                      <div className="relative z-10 mb-3 min-h-[36px]">
                        {runningDevices.length > 0 ? (
                          <p className="line-clamp-2 text-xs font-semibold leading-5 text-emerald-300">
                            Running now: {runningDevices.map((item) => item.name).join(", ")}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold leading-5 text-zinc-500">
                            No devices are currently running in this group.
                          </p>
                        )}
                      </div>
                    ) : null}

                    <div className="relative z-10 mb-3 flex items-center justify-between gap-3 text-sm">
                      <span className={hasRunningUnit ? 'text-zinc-300' : 'text-zinc-500'}>{device.location ?? "Whole house"}</span>
                      <span className="font-bold text-white">{device.power_usage_w} W</span>
                    </div>

                    <div className="relative z-10 mt-auto flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                      <div
                        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-200 ${
                          pendingDeleteId === device.id ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <div className="pointer-events-auto w-full max-w-[320px] rounded-2xl border border-red-500/25 bg-zinc-950/96 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3">
                            <p className="text-sm font-semibold text-red-200">Remove this device from Smart Control?</p>
                            <p className="mt-1 text-xs font-medium text-zinc-400">{getDeviceLabel(device)}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDevice(device)}
                              className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/25"
                            >
                              Yes
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between gap-3 w-full ${pendingDeleteId === device.id ? "opacity-15" : "opacity-100"}`}>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                          hasRunningUnit ? 'bg-green-500/10 text-green-300' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${hasRunningUnit ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                          {hasRunningUnit ? `${runningCount} On` : 'Off'}
                        </span>
                        <div className="flex items-center gap-2">
                          <ThemedTooltip
                            label="Edit device"
                            tooltipClassName="right-0 left-auto top-auto bottom-full z-[180] mb-2 mt-0 translate-x-0"
                          >
                            <button
                              type="button"
                              onClick={() => beginEdit(device)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
                              aria-label="Edit device"
                            >
                              <Pencil size={15} />
                            </button>
                          </ThemedTooltip>
                          <ThemedTooltip
                            label="Remove device"
                            tooltipClassName="right-0 left-auto top-auto bottom-full z-[180] mb-2 mt-0 translate-x-0"
                          >
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(device.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                              aria-label="Remove device"
                            >
                              <Trash2 size={15} />
                            </button>
                          </ThemedTooltip>
                        </div>
                      </div>
                    </div>

                    {hasRunningUnit && (
                      <div className={`pointer-events-none absolute inset-0 z-0 ${overlayClass}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>


    </div>
  );
}
