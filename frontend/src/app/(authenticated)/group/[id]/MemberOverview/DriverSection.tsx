"use client";
import { PlusIcon, UserCircle2, X } from "lucide-react";
import { User } from "../../../../../types/user";
import { LocationButton } from "./UserInfo";
import BaseSection from "./BaseSection";
import { useUserStore } from "@/stores/UserStore";
import { useGroupStore } from "@/stores/GroupStore";

const DriverSection = ({ driver }: { driver: User | null }) => {
  const user = useUserStore((s) => s.user);

  const isCurrentUser = user?.id === driver?.id;

  return (
    <BaseSection type="driver">
      {/* User Info */}
      {driver ? (
        <DriverInfo driver={driver} isCurrentUser={isCurrentUser} />
      ) : (
        <NoDriver />
      )}
    </BaseSection>
  );
};
export default DriverSection;

const DriverInfo = ({
  driver,
  isCurrentUser,
}: {
  driver: User;
  isCurrentUser: boolean;
}) => {
  const unbecomeDriver = useGroupStore((s) => s.unbecomeDriver);

  return (
    <div className="w-full flex justify-between items-center bg-white ">
      <div className="flex gap-3 items-center">
        {driver.avatar ? (
          <img
            src={driver.avatar}
            alt={`${driver.name || "User"}'s avatar`}
            className="rounded-full shadow-xs w-8 h-8 object-cover"
          />
        ) : (
          <UserCircle2 className="w-8 h-8 text-gray-500" />
        )}
        <div className="text-base text-gray-800">
          {isCurrentUser ? "You" : driver.name}
        </div>
      </div>
      {/* Interaction Buttons */}
      <div className="flex gap-2 items-center">
        {driver.location && <LocationButton location={driver.location} />}
        {/* Button to unassign yourself as the driver */}
        {isCurrentUser && (
          <div
            className="p-2 btn bg-(image:--button-purple-gradient)"
            onClick={unbecomeDriver}
          >
            <X className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

const NoDriver = () => {
  const { becomeDriver } = useGroupStore();

  return (
    <>
      <div className="w-full text-center text-gray-500 text-sm">
        No driver assigned yet
      </div>
      <div
        className="p-2 btn bg-(image:--button-purple-gradient)"
        onClick={becomeDriver}
      >
        <PlusIcon className="w-4 h-4 text-white" />
      </div>
    </>
  );
};
