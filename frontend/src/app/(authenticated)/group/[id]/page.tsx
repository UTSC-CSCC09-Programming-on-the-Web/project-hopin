"use client";
import Map from "@/components/Map";
import { useGroupStore } from "@/stores/GroupStore";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useUserStore } from "@/stores/UserStore";
import PassengerControls from "./PassengerControls/PassengerControls";
import DriverControls from "./DriverControls/DriverControls";
import MobileParticipants from "@/components/MobileParticipants";

export default function GroupPage() {
  const user = useUserStore((s) => s.user);
  const group = useGroupStore((state) => state.group);
  const loadingGroup = useGroupStore((state) => state.loadingGroup);
  const router = useRouter();

  useEffect(() => {
    if (!group && !loadingGroup) {
      router.push("/home");
      return;
    }
  }, [group, loadingGroup, router]);

  if (loadingGroup) {
    return <LoadingSpinner text="Loading group information..." />;
  }

  if (!loadingGroup && !group) {
    return null;
  }

  const isDriver = group?.driver?.id === user?.id;

  return (
    <div className="relative w-full h-screen">
      {/* Control Panel */}
      {/* <MobileParticipants> */}
      {isDriver ? <DriverControls /> : <PassengerControls />}
      {/* </MobileParticipants> */}

      {/* Leave group button */}
      <div className="absolute right-8 top-8 z-20">
        <button
          className="h-fit aspect-square p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition"
          onClick={() => useGroupStore.getState().leaveGroup()}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>
      {/* Map */}
      <Map />
    </div>
  );
}
