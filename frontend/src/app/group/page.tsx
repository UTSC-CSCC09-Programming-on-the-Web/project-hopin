"use client";
import LocationInput from "@/components/inputs/LocationInput";
import Map from "@/components/Map";
import { Coordinates, Route } from "../../../types/location";
import { useEffect, useState } from "react";
import IconWrapper from "@/components/IconWrapper";
import {
  Flag as StartIcon,
  MapPin as EndIcon,
  CarTaxiFront,
  UserCircle2,
  MapPin,
} from "lucide-react";
import { useMapContext } from "../../../contexts/MapContext";
import { User } from "../../../types/user";
import { useGroupContext } from "../../../contexts/GroupContext";
import useLocation from "../../../lib/hooks/useLocation";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useUserContext } from "../../../contexts/UserContext";
import Head from "next/head";
import Header from "@/components/header";
import MobileParticipants from "@/components/MobileParticipants";

export default function GroupPage() {
  const { createRoute } = useMapContext();
  const location = useLocation();
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);
  const router = useRouter();
  const isDriver = true; // dummy data for now
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // need to include api to get the nearest passenger
  // const { group } = useGroupContext();
  // const { centerOnLocation } = useMapContext();
  // const enroute = () => {
  //   const readyPassengers = group?.members?.filter(
  //     (m) => m.id !== group.driver?.id && m.location
  //   );

  //   if (!readyPassengers || readyPassengers.length === 0) {
  //     toast.error("No passengers with available location.");
  //     return;
  //   }

  //   const passenger = readyPassengers[0]; // need to find nearest passenger
  //   centerOnLocation(passenger.location);
  //   toast(`Navigating to ${passenger.name}`);
  // };

  useEffect(() => {
    if (!startLocation && location) {
      // If no start location is set, use the current location
      setStartLocation(location);
    } else if (startLocation && endLocation) {
      // Draw the route when both locations are set
      createRoute(startLocation, endLocation);
    }
  }, [location, startLocation, endLocation]);

  // useEffect(() => {
  //   if (!group) {
  //     router.push("/"); // Redirect to home if no group
  //   }
  // }, [group, createGroup]);

  // if (!group) return null;

  return (
    <>
      <Header />

      <main className="relative h-full w-full">
        {/* desktop view */}
        <div className="hidden md:grid md:grid-cols-[1fr_3fr] h-full w-full gap-4 md:gap-8">
          {/* Left Side */}
          <div className="flex flex-col gap-4 items-start">
            <h5 className="text-gray-700 text-2xl">Journey Planner</h5>

            <div className="flex gap-4 items-center h-fit w-full">
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
              <div className="flex flex-col gap-6 items-start w-full">
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
            {/* User List */}
            <ParticipantList />
          </div>
          {/* Right (Map) Side */}
          <div className="relative w-full h-full">
            <Map />
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden w-full h-screen">
          <div className="flex flex-col gap-4 items-start">
            <h5 className="text-gray-700 text-sm md:text-md">
              Journey Planner
            </h5>

            <div className="flex gap-4 items-center h-fit w-full pb-4">
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
              <div className="flex flex-col gap-6 items-start w-full">
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
          <div className="relative w-full h-[70vh] aspect-video">
            <Map />
          </div>
          <MobileParticipants>
            <ParticipantList />
          </MobileParticipants>
        </div>
      </main>
    </>
  );
}

const ParticipantList = () => {
  const { group } = useGroupContext();
  const { currentUser } = useUserContext();

  if (!group) {
    // Return skeleton state
    return (
      <div className="w-full h-full flex animate-pulse bg-gray-200 rounded-lg" />
    );
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg overflow-clip bg-white shadow-sm">
      {/* Heading */}
      <div className="content-center bg-orange-400 px-4 py-2">
        <div className="text-lg font-semibold text-center text-white">
          Participants ({group.members.length})
        </div>
      </div>
      {/* Body */}
      <div className="h-full w-full flex flex-col gap-4 p-4 items-center overflow-y-scroll scrollbar-hidden">
        {/* Driver Section */}
        <DriverSection driver={group.driver} />
        {/* Ready Users List */}
        <ReadySection
          members={group.members.filter((member) => {
            return (
              member.id !== group.driver?.id && currentUser?.id !== member.id
            );
          })}
        />
      </div>

      {/* Footer (Room Code) */}
      <div className="w-full flex flex-col items-center p-4 bg-orange-400">
        <h5 className="font-semibold text-white">{group.id}</h5>
        <div className="label text-orange-100">
          Share this code with your group!
        </div>
      </div>
    </div>
  );
};

const DriverSection = ({ driver }: { driver: User | null }) => {
  return (
    <div className="flex flex-col p-2 gap-2 w-full bg-[#FCC2E8] rounded-lg">
      {/* Header */}
      <div className="flex gap-2 items-center">
        <div
          className="rounded-full p-1 w-fit aspect-square shadow-xs"
          style={{
            backgroundImage:
              "linear-gradient(159deg, #8A107E 13.79%, #500934 122.63%)",
          }}
        >
          <CarTaxiFront className="w-5 h-5 text-white" />
        </div>
        <div className="text-[#8A1076] text-base font-medium">Driver</div>
      </div>
      <div className="inset-shadow-xs bg-white p-2 w-full flex flex-col overflow-scroll scrollbar-hidden gap-4 rounded-lg">
        {/* User Info */}
        {driver ? (
          <UserInfo user={driver} />
        ) : (
          <div className="text-gray-500 text-sm">No driver assigned yet</div>
        )}
      </div>
    </div>
  );
};

const UserInfo = ({ user }: { user: User }) => {
  const { centerOnLocation } = useMapContext();

  const { name, location } = user;

  const onLocationClick = () => {
    if (!location) {
      toast.error("Location not available for this user.");
      return;
    }
    centerOnLocation(location);
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-3 items-center">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.name || "User"}'s avatar`}
            className="w-8 h-8 object-cover opacity-70"
          />
        ) : (
          <UserCircle2 className="w-8 h-8 text-gray-500" />
        )}
        <div className="text-base text-gray-800">{name}</div>
      </div>
      <div
        className="p-2 btn bg-(image:--button-orange-gradient)"
        onClick={onLocationClick}
      >
        <MapPin className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};

type ReadySectionProps = {
  members: User[];
};

const ReadySection = ({ members }: ReadySectionProps) => {
  return (
    <div className="flex flex-col p-2 gap-2 w-full bg-[#D1FCC2] rounded-lg">
      {/* Header */}
      <div className="flex gap-2 items-center">
        <div
          className="rounded-full p-1 w-fit aspect-square shadow-xs"
          style={{
            backgroundImage:
              "linear-gradient(159deg, #108A2C 13.79%, #095019 122.63%)",
          }}
        >
          <CarTaxiFront className="w-5 h-5 text-white" />
        </div>
        <div className="text-[#108A2C] text-base font-medium">
          Ready Passengers
        </div>
      </div>
      <div className="inset-shadow-xs bg-white p-2 w-full flex flex-col overflow-scroll scrollbar-hidden gap-4 rounded-lg">
        {/* User Info */}
        {members.length > 0 ? (
          members.map((member) => <UserInfo key={member.id} user={member} />)
        ) : (
          <div className="text-gray-500 text-sm">No passengers ready yet</div>
        )}
      </div>
    </div>
  );
};
