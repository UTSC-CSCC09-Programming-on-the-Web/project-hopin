"use client";
import { useState } from "react";
import MemberOverview from "../MemberOverview/MemberOverview";
import RouteList from "./RouteList";
import { useGroupStore } from "@/stores/GroupStore";
import ControlsLayout from "./ControlsLayout";

type PageType = "members" | "route";
export default function DriverControls() {
    const [page, setPage] = useState<PageType>("route");
    const group = useGroupStore((s) => s.group);

    if (!group) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">
                    Loading group information...
                </div>
            </div>
        );
    }

    return (
        <>
            <ControlsLayout>
                <div className="flex flex-col h-full w-full">
                    {/* Header Showing the Page Titles */}
                    <DriverControlsHeader page={page} setPage={setPage} />
                    {/* Conditional render based on selected page */}
                    {page === "members" ? (
                        <MemberOverview showHeader={false} />
                    ) : (
                        <RouteOverview />
                    )}
                </div>
            </ControlsLayout>
        </>
    );
}

const DriverControlsHeader = ({
    page,
    setPage,
}: {
    page: PageType;
    setPage: (page: PageType) => void;
}) => {
    const isRouteUpToDate = useGroupStore((s) => s.isRouteUpToDate);

    return (
        <div className="bg-white rounded-t-lg overflow-clip grid grid-cols-2 w-full">
            <PageButton
                text="Route"
                isActive={page === "route"}
                onClick={() => setPage("route")}
                isNotification={!isRouteUpToDate}
            />
            <PageButton
                text="Members"
                isActive={page === "members"}
                onClick={() => setPage("members")}
            />
        </div>
    );
};

const PageButton = ({
    text,
    isActive,
    onClick,
    isNotification = false,
}: {
    text: string;
    isActive: boolean;
    onClick: () => void;
    isNotification?: boolean;
}) => {
    return (
        <button
            className={`relative cursor-pointer px-4 py-2 rounded-t-lg text-lg transition ${
                isActive
                    ? "bg-orange-400 text-white font-semibold"
                    : "bg-white text-orange-400"
            } ${
                isNotification
                    ? "after:content-[''] after:absolute after:top-0 after:right-0 after:w-4 after:aspect-square after:bg-red-700 after:rounded-full after:border-2 after:border-white"
                    : ""
            }`}
            onClick={onClick}
        >
            {text}
        </button>
    );
};

const RouteOverview = () => {
    // Filter out the driver from the members list
    const members = useGroupStore((s) => s.group?.members || []);
    const driver = useGroupStore((s) => s.group?.driver);
    const filteredMembers = members.filter((m) => m.id !== driver?.id);

    return (
        <>
            <div className="h-full w-full flex flex-col rounded-lg overflow-clip bg-white shadow-sm">
                <RouteList initialUsers={filteredMembers} />
                <RouteInfo />
            </div>
        </>
    );
};

const RouteInfo = () => {
    const route = useGroupStore((s) => s.group?.route);

    if (!route) return null;

    return (
        <div className="w-full flex flex-col items-center p-4 bg-orange-400">
            <div className="text-xl text-white">
                <strong>Duration:</strong> {Math.ceil(route.duration / 60)} mins
            </div>
            <div className="text-xl text-white">
                <strong>Distance:</strong> {Math.ceil(route.distance / 1000)} km
            </div>
        </div>
    );
};
