"use client";
import { useEffect, useState, useRef } from "react";
import LocationInput, {
  LocationInputRef,
} from "@/components/inputs/LocationInput";
import { useUserStore } from "@/stores/UserStore";
import { MapPin as EndIcon } from "lucide-react";
import IconWrapper from "@/components/IconWrapper";
import { fetchRoute } from "@/lib/apis/directionsAPI";
import { drawRoute } from "@/stores/MapStore";
import { Check as ConfirmIcon } from "lucide-react";
import toast from "react-hot-toast";
import { userApi } from "@/lib/apis/userAPI";
import { Place } from "@/types/location";

const LocationInputsSection = () => {
  const user = useUserStore((s) => s.user);
  const [destinationChanged, setDestinationChanged] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const locationInputRef = useRef<LocationInputRef>(null);

  useEffect(() => {
    const drawUserRoute = async () => {
      if (!user?.location || !destination || !destinationChanged) return;

      // Draw the route on the map that is only visible to the user
      const privateRoute = await fetchRoute([user, destination]);
      if (!privateRoute) return;
      drawRoute(privateRoute, "user");
    };

    drawUserRoute();
  }, [user, destination, destinationChanged]);

  const handleConfirm = async () => {
    if (!destination) {
      toast.error("Please set a destination first.");
      return;
    }

    // Notify the driver that the member's destination has changed
    await userApi.updateLocationOrDestination("destination", destination.location);
    setDestinationChanged(false);
    locationInputRef.current?.reset(); // Reset LocationInput state
    toast.success("Your destination is set!");
  };

  const handleSelect = (place: Place) => {
    setDestination(place);
    setDestinationChanged(true);
  };

  return (
    <div className="flex gap-4 items-center h-fit px-4 py-3 bg-white rounded-lg shadow-sm w-full">
      <IconWrapper Icon={EndIcon} />
      <LocationInput
        ref={locationInputRef}
        placeholder="Enter destination"
        onSelect={handleSelect}
      />
      {destinationChanged && (
        <div
          className="p-2 btn bg-(image:--button-purple-gradient)"
          onClick={handleConfirm}
        >
          <ConfirmIcon className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

export default LocationInputsSection;
