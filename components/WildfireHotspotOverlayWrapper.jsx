import dynamic from "next/dynamic";

const WildfireHotspotOverlay = dynamic(() => import("./WildfireHotspotOverlay"), {
  ssr: false,
});

export default WildfireHotspotOverlay;
