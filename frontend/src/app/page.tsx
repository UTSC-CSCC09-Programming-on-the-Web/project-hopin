"use client";
import Button from "@/components/buttons/Button";
import Map from "@/components/Map";
import { useGroupContext } from "../../contexts/GroupContext";
import { useRouter } from "next/navigation";

function page() {
  const { createGroup } = useGroupContext();
  const router = useRouter();

  const handleCreateGroupClick = () => {
    createGroup();
    router.push("/group");
  };

  return (
    <div className="flex flex-col items-center h-screen gap-8">
      <div className="relative w-full aspect-video">
        <Map />
      </div>
      <div className="flex gap-8 items-center">
        {/* TODO: replace with a dynamic route with a generated room id */}
        <Button text="Create Group" onClick={handleCreateGroupClick} />
        <div className="text-lg">OR</div>
        <Button text="Join Group" variant="outline" />
      </div>
    </div>
  );
}

export default page;
