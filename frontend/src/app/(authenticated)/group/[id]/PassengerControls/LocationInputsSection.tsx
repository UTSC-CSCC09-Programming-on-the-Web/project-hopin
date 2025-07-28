"use client";
import { useEffect, useState } from "react";
import { Coordinates } from "@/types/location";
import LocationInput from "@/components/inputs/LocationInput";
import { useUserStore } from "@/stores/UserStore";
import { useMapStore } from "@/stores/MapStore";
import { Flag as StartIcon, MapPin as EndIcon } from "lucide-react";
import IconWrapper from "@/components/IconWrapper";

const LocationInputsSection = () => {
  const createRoute = useMapStore((s) => s.createRoute);
  const user = useUserStore((s) => s.user);
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!startLocation && user?.location) {
      // If no start location is set, use the user's current location as a default
      setStartLocation(user.location);
    } else if (startLocation && endLocation) {
      // Draw the route when both locations are set
      createRoute(startLocation, endLocation);
    }
  }, [user?.location, startLocation, endLocation, createRoute]);

  return (
    <div className="flex gap-4 items-center h-fit px-4 py-3 bg-white rounded-lg shadow-sm w-full">
      <div className="flex flex-col h-full gap-2 items-center">
        <>
          <IconWrapper Icon={StartIcon} />
          <div className="flex flex-col gap-1 items-center">
            <div className="w-1 h-1 rounded-full bg-gray-200" />
            <div className="w-1 h-1 rounded-full bg-gray-200" />
          </div>
        </>
        <IconWrapper Icon={EndIcon} />
      </div>
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
  );
};

export default LocationInputsSection;
