"use client";
import { User } from "../../../../../types/user";
import { MapPin, UserCircle2 } from "lucide-react";
import { Coordinates } from "../../../../../types/location";
import toast from "react-hot-toast";
import { useUserStore } from "@/stores/UserStore";
import { centerOnLocation } from "@/stores/MapStore";

const UserInfo = ({ user }: { user: User | null }) => {
  const curUser = useUserStore((s) => s.user);

  if (!user) return null;

  const isCurrentUser = curUser?.id === user.id;
  const displayName = isCurrentUser ? "You" : user.name || "Guest";

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex gap-3 items-center">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.name || "User"}'s avatar`}
            className="rounded-full shadow-xs w-8 h-8 object-cover"
          />
        ) : (
          <UserCircle2 className="w-8 h-8 text-gray-500" />
        )}
        <div className="text-base text-gray-800">{displayName}</div>
      </div>
      <LocationButton location={user.location} />
    </div>
  );
};

export default UserInfo;

type LocationButtonProps = {
  location: Coordinates | undefined;
};

export const LocationButton = ({ location }: LocationButtonProps) => {
  const onLocationClick = () => {
    if (!location) {
      toast.error("Location is not available.");
      return;
    }
    centerOnLocation(location);
  };

  return (
    location && (
      <div
        className="p-2 btn bg-(image:--button-orange-gradient)"
        onClick={onLocationClick}
      >
        <MapPin className="w-4 h-4 text-white" />
      </div>
    )
  );
};
