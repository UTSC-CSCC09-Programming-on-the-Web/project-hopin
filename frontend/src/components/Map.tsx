"use client";
import { useEffect, useRef } from "react";
import "./Map.css";
import { useMapInit } from "@/lib/hooks/useMapInit";
import { useUserMarkers } from "@/lib/hooks/useUserMarkers";
import { clearRoute, drawRoute, useMapStore } from "@/stores/MapStore";
import { useGroupStore } from "@/stores/GroupStore";

type MapProps = {
  className?: string;
};

export default function Map({ className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { attachToContainer } = useMapInit();
  const { map, isLoaded, setIsLoaded } = useMapStore();
  const group = useGroupStore((state) => state.group);
  useUserMarkers();

  useEffect(() => {
    attachToContainer(containerRef.current);
  }, [attachToContainer]);

  // Listen for map style load
  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      setIsLoaded(true);
    } else {
      const onStyleLoad = () => setIsLoaded(true);
      map.on("style.load", onStyleLoad);
      return () => {
        map.off("style.load", onStyleLoad);
      };
    }
  }, [map, setIsLoaded]);

  // Draw or clear group route
  useEffect(() => {
    if (map && isLoaded && group?.route) drawRoute(group.route, "group");
    else clearRoute("group");
  }, [map, isLoaded, group?.route]);

  return <div ref={containerRef} id="map-container" className={className} />;
}
