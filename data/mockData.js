import { Navigation, Waves, Home, Activity, Flame, CloudRain, Route, Users } from "lucide-react";

export const MODULES = [
  { id: "escape", label: "Escape assistant", short: "Escape", icon: Navigation, tag: "critical" },
  { id: "route", label: "Safe route planner", short: "Routes", icon: Route, tag: "info" },
  { id: "shelters", label: "Shelter finder", short: "Shelters", icon: Home, tag: "info" },
  { id: "family", label: "Family tracking", short: "Family", icon: Users, tag: "safe" },
  { id: "flood", label: "Flood monitoring", short: "Flood", icon: Waves, tag: "warning" },
  { id: "wildfire", label: "Wildfire risk", short: "Wildfire", icon: Flame, tag: "critical" },
  { id: "earthquake", label: "Earthquake info", short: "Quake", icon: Activity, tag: "info" },
  { id: "weather", label: "Weather alerts", short: "Weather", icon: CloudRain, tag: "warning" },
];
