"use client";
import { useGroupStore } from "@/stores/GroupStore";
import DriverSection from "./DriverSection";
import PassengerSection from "./PassengerSection";

type MemberOverviewProps = {
  showHeader?: boolean;
};

const MemberOverview = ({ showHeader = true }: MemberOverviewProps) => {
  const group = useGroupStore((s) => s.group);

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading group information...</div>
      </div>
    );
  }

  const { id, driver, members } = group;

  const filteredMembers = members.filter((member) => {
    return member.id !== driver?.id;
  });

  return (
    <div className="h-full w-full flex flex-col rounded-lg overflow-clip bg-white shadow-sm">
      {/* Header */}
      {showHeader && (
        <div className="content-center bg-orange-400 px-4 py-2">
          <div className="text-lg font-semibold text-center text-white">
            Participants ({members.length})
          </div>
        </div>
      )}

      {/* Body */}
      <div className="h-full w-full flex flex-col gap-4 p-4 items-center overflow-y-scroll scrollbar-hidden">
        {/* Driver Section */}
        <DriverSection driver={driver} />
        {/* Ready Users List */}
        <PassengerSection members={filteredMembers} />
      </div>

      {/* Footer (Room Code) */}
      <div className="w-full flex flex-col items-center p-4 bg-orange-400">
        <h5 className="font-semibold text-white">{id}</h5>
        <div className="label text-orange-100 text-center">
          Share this code with your group!
        </div>
      </div>
    </div>
  );
};

export default MemberOverview;
