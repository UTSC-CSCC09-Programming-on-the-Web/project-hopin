"use client";
import { useState } from "react";
import MemberOverview from "../MemberOverview/MemberOverview";
import ListReorder from "@/components/ListReorder";
import { useGroupStore } from "@/stores/GroupStore";

type PageType = "members" | "route";
const DriverControls = () => {
  const [page, setPage] = useState<PageType>("members");
  const group = useGroupStore((s) => s.group);

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading group information...</div>
      </div>
    );
  }

  const { members } = group;

  return (
    <div className="absolute top-8 bottom-8 left-12 z-20 flex flex-col items-start">
      {/* Header Showing the Page Titles */}
      <div className="bg-white rounded-t-lg overflow-clip grid grid-cols-2 w-full">
        <PageButton
          text="Members"
          isActive={page === "members"}
          onClick={() => setPage("members")}
        />
        <PageButton
          text="Route"
          isActive={page === "route"}
          onClick={() => setPage("route")}
        />
      </div>
      {/* Conditional render based on selected page */}
      {page === "members" ? (
        <MemberOverview showHeader={false} />
      ) : (
        <div className="h-full w-full flex flex-col rounded-lg overflow-clip bg-white shadow-sm">
          <ListReorder initialUsers={members} />
        </div>
      )}
    </div>
  );
};

export default DriverControls;

const PageButton = ({
  text,
  isActive,
  onClick,
}: {
  text: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className={`cursor-pointer px-4 py-2 rounded-t-lg text-lg transition ${
        isActive
          ? "bg-orange-400 text-white font-semibold"
          : "bg-white text-orange-400"
      }`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};
