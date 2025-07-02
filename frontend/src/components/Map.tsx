"use client";
import { useEffect, useRef } from "react";
import "./Map.css";
import { useMapContext } from "../../contexts/MapContext";
import useUsersOnMap from "../../lib/hooks/useUsersOnMap";

type MapProps = {
  className?: string;
};

export default function Map({ className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { attachToContainer, map } = useMapContext();

  useEffect(() => {
    attachToContainer(containerRef.current);
  }, [attachToContainer]);
  return <div ref={containerRef} id="map-container" className={className} />;
}
