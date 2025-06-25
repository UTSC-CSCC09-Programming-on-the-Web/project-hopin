"use client";
import LocationInput from "@/components/inputs/LocationInput";
import Map from "@/components/Map";
import { Coordinates } from "../../../types/location";
import { useEffect, useState } from "react";
import IconWrapper from "@/components/IconWrapper";
import { Flag as StartIcon, MapPin as EndIcon } from "lucide-react";
import { useMapContext } from "../../../contexts/MapContext";

export default function GroupPage() {
  const { location, createRoute: drawRoute } = useMapContext();
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!startLocation && location) {
      // If no start location is set, use the current location
      setStartLocation(location);
    } else if (startLocation && endLocation) {
      // Draw the route when both locations are set
      drawRoute(startLocation, endLocation);
    }
  }, [location, startLocation, endLocation]);

  return (
    <main className="grid grid-cols-[1fr_3fr] h-full w-full gap-8">
      {/* Left Side */}
      <div className="flex flex-col gap-8 items-start">
        <h5 className="text-gray-700">Journey Planner</h5>
        <div className="flex gap-4 items-center h-fit">
          {/* Location Icons */}
          <div className="flex flex-col h-full gap-2 items-center">
            <IconWrapper Icon={StartIcon} />
            {/* vertical dots */}
            <div className="flex flex-col gap-1 items-center">
              <div className="w-1 h-1 rounded-full bg-gray-200" />
              <div className="w-1 h-1 rounded-full bg-gray-200" />
            </div>
            <IconWrapper Icon={EndIcon} />
          </div>
          {/* Location Inputs */}
          <div className="flex flex-col gap-6 items-start">
            <LocationInput
              placeholder={
                location ? "Current Location" : "Enter starting location"
              }
              onSelect={(coord) => {
                const place: Coordinates = {
                  longitude: coord[0],
                  latitude: coord[1],
                };
                setStartLocation(place);
              }}
            />
            <LocationInput
              placeholder="Enter ending location"
              onSelect={(coord) => {
                const place: Coordinates = {
                  longitude: coord[0],
                  latitude: coord[1],
                };
                setEndLocation(place);
              }}
            />
          </div>
        </div>
      </div>
      {/* Right (Map) Side */}
      <div className="relative w-full h-full">
        <Map />
      </div>
    </main>
  );
}
