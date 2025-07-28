"use client";
import { useEffect, useRef } from "react";
import "./Map.css";
import { useMapInit } from "@/hooks/useMapInit";
import { useMapMarkers } from "@/hooks/useMapMarkers";

type MapProps = {
  className?: string;
};

export default function Map({ className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { attachToContainer } = useMapInit();

  useEffect(() => {
    attachToContainer(containerRef.current);
  }, [attachToContainer]);

  useMapMarkers();
  return <div ref={containerRef} id="map-container" className={className} />;
}
