"use client";
import Button from "@/components/buttons/Button";
import Map from "@/components/Map";
import { useGroupContext } from "../../../../contexts/GroupContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { group, createGroup } = useGroupContext();

  return (
    <>
      {group && <GroupInfo groupId={group.id} />}
      <div className="fixed inset-0">
        <div className="relative h-screen w-full">
          <Map />
        </div>
      </div>
      <div className="flex gap-8 items-center bg-white p-10 rounded-lg shadow-lg z-10 mb-4">
        <Button text="Create Group" onClick={createGroup} />
        <div className="text-lg">OR</div>
        {/* TODO: implement group joining logic (use joinGroup() in GroupContext + appropriate redirection) */}
        <Button text="Join Group" variant="outline" />
      </div>
    </>
  );
}

type GroupInfoProps = {
  groupId: string;
};
const GroupInfo = ({ groupId }: GroupInfoProps) => {
  const router = useRouter();

  const handleReturn = () => {
    router.push(`/group/${groupId}`);
  };

  const handleLeaveGroup = () => {
    // TODO: Implement leave group logic
  };

  return (
    <div className="fixed z-50 top-4 inset-x-auto mx-auto max-w-md w-full bg-white shadow-sm rounded-lg pointer-events-auto flex ">
      <div className="flex w-full items-center gap-4 p-4">
        <span className="text-2xl">👋</span>

        <div className="text-sm font-medium text-gray-900">
          A ride is in process...
        </div>
      </div>

      <div className="flex border-l border-gray-200">
        <button
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:bg-green-50"
          onClick={() => handleReturn()}
        >
          Return
        </button>
        <button
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:bg-red-50"
          onClick={() => handleLeaveGroup()}
        >
          Leave
        </button>
      </div>
    </div>
  );
};
