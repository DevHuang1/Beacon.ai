import dynamic from "next/dynamic";

const WeatherAlertMapOverlay = dynamic(() => import("./WeatherAlertMapOverlay"), {
  ssr: false,
});

export default WeatherAlertMapOverlay;
