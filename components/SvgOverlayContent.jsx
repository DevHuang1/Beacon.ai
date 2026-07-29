import React from "react";

let SVGOverlay, latLngBounds;
if (typeof window !== "undefined") {
  SVGOverlay = require("react-leaflet").SVGOverlay;
  latLngBounds = require("leaflet").latLngBounds;
}

export default function SvgOverlayContent({ children }) {
  if (!SVGOverlay) {
    return React.createElement("div", {
      style: { display: "none" },
    });
  }
  const worldBounds = latLngBounds([-90, -180], [90, 180]);
  return (
    <SVGOverlay bounds={worldBounds}>
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        {children}
      </svg>
    </SVGOverlay>
  );
}
