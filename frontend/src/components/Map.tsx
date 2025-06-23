"use client";

import { useEffect, useRef } from "react";
import "./Map.css";
import { useMapContext } from "../../contexts/MapContext";

export default function Map() {
  const { mapContainer } = useMapContext();
  return <div ref={mapContainer} id="map-container" />;
}
