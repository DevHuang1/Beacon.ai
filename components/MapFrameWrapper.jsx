import dynamic from "next/dynamic";

const MapFrame = dynamic(() => import("./MapFrame"), { ssr: false });

export default MapFrame;
