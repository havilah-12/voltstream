import {
  AirVent,
  Flame,
  Laptop,
  Leaf,
  Lightbulb,
  Microwave,
  Plug,
  Power,
  Refrigerator,
  Snowflake,
  Tv,
  WashingMachine,
  Wind,
} from "lucide-react";

export const DEVICE_TYPE_ALIASES = new Map([
  [["ac", "air conditioner", "airconditioning", "air-conditioner"], "AC"],
  [["fan"], "Fan"],
  [["cooler", "air cooler"], "Cooler"],
  [["heater", "room heater"], "Heater"],
  [["water heater", "waterheater", "geyser"], "Water Heater"],
  [["fridge", "refrigerator"], "Fridge"],
  [["washing machine", "washer", "washingmachine"], "Washing Machine"],
  [["light", "tube light", "tubelight"], "Tube Light"],
  [["bulb"], "Bulb"],
  [["tv", "television"], "TV"],
  [["laptop", "computer"], "Laptop"],
  [["charger"], "Charger"],
  [["microwave", "microwave oven"], "Microwave"],
  [["cooker", "electric cooker", "rice cooker"], "Cooker"],
]);

export const householdDefaults = [
  { id: "cooler-1", type: "Cooler", name: "Cooler 1", location: "Living Room", status: "OFF", power_usage_w: 220 },
  { id: "water-heater-1", type: "Water Heater", name: "Water Heater 1", location: "Bathroom", status: "OFF", power_usage_w: 3000 },
  { id: "light-1", type: "Tube Light", name: "Living Room Tube Light", location: "Living Room", status: "ON", power_usage_w: 18 },
  { id: "light-2", type: "Tube Light", name: "Bedroom Tube Light", location: "Bedroom 1", status: "OFF", power_usage_w: 18 },
  { id: "bulb-1", type: "Bulb", name: "Kitchen Bulb", location: "Kitchen", status: "ON", power_usage_w: 12 },
  { id: "tv-1", type: "TV", name: "TV 1", location: "Living Room", status: "OFF", power_usage_w: 120 },
  { id: "laptop-1", type: "Laptop", name: "Laptop Charger", location: "Study", status: "ON", power_usage_w: 65 },
  { id: "microwave-1", type: "Microwave", name: "Microwave 1", location: "Kitchen", status: "OFF", power_usage_w: 1000 },
  { id: "cooker-1", type: "Cooker", name: "Electric Cooker", location: "Kitchen", status: "OFF", power_usage_w: 700 },
];

export const deviceTypeConfig = {
  ac: { icon: Snowflake, tone: "text-sky-300 bg-sky-500/10 border-sky-500/20", watts: 1500 },
  fan: { icon: Wind, tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20", watts: 50 },
  cooler: { icon: AirVent, tone: "text-teal-300 bg-teal-500/10 border-teal-500/20", watts: 220 },
  heater: { icon: Flame, tone: "text-orange-300 bg-orange-500/10 border-orange-500/20", watts: 2000 },
  "water heater": { icon: Flame, tone: "text-red-300 bg-red-500/10 border-red-500/20", watts: 3000 },
  fridge: { icon: Refrigerator, tone: "text-lime-300 bg-lime-500/10 border-lime-500/20", watts: 200 },
  "washing machine": { icon: WashingMachine, tone: "text-violet-300 bg-violet-500/10 border-violet-500/20", watts: 500 },
  "tube light": { icon: Lightbulb, tone: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20", watts: 18 },
  bulb: { icon: Lightbulb, tone: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20", watts: 12 },
  tv: { icon: Tv, tone: "text-blue-300 bg-blue-500/10 border-blue-500/20", watts: 120 },
  laptop: { icon: Laptop, tone: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20", watts: 65 },
  charger: { icon: Plug, tone: "text-zinc-300 bg-zinc-500/10 border-zinc-500/20", watts: 35 },
  microwave: { icon: Microwave, tone: "text-rose-300 bg-rose-500/10 border-rose-500/20", watts: 1000 },
  cooker: { icon: Plug, tone: "text-red-300 bg-red-500/10 border-red-500/20", watts: 700 },
};

export const seasonalModes = {
  manual: {
    label: "Manual Control",
    helper: "No automatic seasonal changes applied.",
    icon: Power,
  },
  summer: {
    label: "Summer Cooling",
    helper: "AC, fans and coolers ON; heaters OFF.",
    icon: Snowflake,
    on: ["ac", "fan", "cooler"],
    off: ["heater"],
  },
  winter: {
    label: "Winter Warm",
    helper: "Room heaters ON; AC, fans and coolers OFF.",
    icon: Flame,
    on: ["heater"],
    off: ["ac", "fan", "cooler"],
  },
  saving: {
    label: "Energy Saving",
    helper: "Keeps 2 fans and key essentials ON; heavy appliances OFF.",
    icon: Leaf,
  },
  vacation: {
    label: "Vacation Mode",
    helper: "Turns every listed device OFF while the home is away or inactive.",
    icon: Power,
    allOff: true,
  },
};

export const deviceSections = [
  {
    title: "Daily Essentials",
    helper: "Everyday household devices",
    types: ["fan", "tube light", "bulb", "fridge"],
  },
  {
    title: "Climate Control",
    helper: "Cooling and heating appliances",
    types: ["ac", "cooler", "heater", "water heater"],
  },
  {
    title: "Home Appliances",
    helper: "Kitchen and laundry loads",
    types: ["washing machine", "microwave", "cooker"],
  },
  {
    title: "Electronics",
    helper: "TV, laptop and charging devices",
    types: ["tv", "laptop", "charger"],
  },
];

export const statusOptions = [
  { value: "ON", label: "Currently Running" },
  { value: "OFF", label: "Turned Off" },
];

export const emptyForm = { type: "AC", name: "AC 1", location: "Bedroom 1", status: "OFF", power_usage_w: 1500 };
