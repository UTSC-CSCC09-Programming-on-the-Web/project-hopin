"use client";
import Button from "@/components/buttons/Button";
import Input from "@/components/inputs/Input";
import Map from "@/components/Map";
import { useGroupStore } from "@/stores/GroupStore";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/header";
import { useUserStore } from "@/stores/UserStore";
import { useEffect } from "react";
import { userApi } from "@/lib/apis/userAPI";
import { subscriptionApi } from "@/lib/apis/subscriptionAPI";

export default function HomePage() {
  const { group, createGroup } = useGroupStore();
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user } = useUserStore();

  // Redirect users without subscriptions
  useEffect(() => {
    const checkSubscription = async () => {
      userApi.getSubscriptionStatus().then((stat) => {
        if (stat === "active") return;
        // TODO: Rethink this routing
        else if (stat === "paused") {
          if (user?.id) {
            subscriptionApi.createPortalSession();
          } else {
            console.error("Missing user id for portal session.");
            router.push("/account/subscribe");
          }
        } else router.push("/account/subscribe");
      });
    };
    checkSubscription();
  }, []);

  const handleCreateGroup = async () => {
    const id = await createGroup();
    if (id) router.push(`/group/${id}`);
  };

  return (
    <>
      <div className="fixed inset-0">
        <div className="relative h-screen w-full">
          <Map />
        </div>
      </div>
      {group ? (
        <GroupInfoPopup groupId={group.id} />
      ) : (
        <div className="flex gap-8 items-center bg-white p-10 rounded-lg shadow-lg z-10 mb-4">
          <Button text="Create Group" onClick={handleCreateGroup} />
          <div className="text-lg">OR</div>

          <Button
            text="Join Group"
            variant="outline"
            onClick={() => setShowJoinModal((prev) => !prev)}
          />
          {showJoinModal && (
            <JoinGroupModal onClose={() => setShowJoinModal(false)} />
          )}
        </div>
      )}
    </>
  );
}

const GroupInfoPopup = ({ groupId }: { groupId: string }) => {
  const router = useRouter();
  const leaveGroup = useGroupStore((state) => state.leaveGroup);

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
          onClick={() => router.push(`/group/${groupId}`)}
        >
          Return
        </button>
        <button
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:bg-red-50"
          onClick={leaveGroup}
        >
          Leave
        </button>
      </div>
    </div>
  );
};

type JoinGroupModalProps = {
  onClose: () => void;
};

const JoinGroupModal = ({ onClose }: JoinGroupModalProps) => {
  const [groupId, setGroupId] = useState("");
  const joinGroup = useGroupStore((state) => state.joinGroup);
  const router = useRouter();

  const handleJoin = async () => {
    const id = await joinGroup(groupId);
    if (id) router.push(`/group/${id}`);
  };

  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center bg-gray-800/10  backdrop-blur-sm">
      <div className="relative bg-white p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
        <X
          className="absolute top-4 right-4 cursor-pointer"
          onClick={onClose}
        />
        <h6 className="text-center">Join Group</h6>
        <Input
          type="text"
          name="groupId"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder="Enter Group ID"
        />
        <Button text="Join" onClick={handleJoin} />
      </div>
    </div>
  );
};
