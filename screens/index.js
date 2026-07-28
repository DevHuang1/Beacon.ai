import EscapeAssistant from "./EscapeAssistant";
import FloodMonitoring from "./FloodMonitoring";
import ShelterFinder from "./ShelterFinder";
import EarthquakeInfo from "./EarthquakeInfo";
import WildfireRisk from "./WildfireRisk";
import WeatherAlerts from "./WeatherAlerts";
import SafeRoutePlanner from "./SafeRoutePlanner";
import FamilyTracking from "./FamilyTracking";

export default {
  escape: EscapeAssistant,
  route: SafeRoutePlanner,
  shelters: ShelterFinder,
  family: FamilyTracking,
  flood: FloodMonitoring,
  wildfire: WildfireRisk,
  earthquake: EarthquakeInfo,
  weather: WeatherAlerts,
};

