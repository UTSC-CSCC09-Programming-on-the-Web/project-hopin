import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useUserStore } from "@/stores/UserStore";
import { useGroupStore } from "@/stores/GroupStore";
import { centerOnLocation, useMapStore } from "@/stores/MapStore";
import { User } from "@/types/user";

// Custom hook to manage user markers on the map
export const useMapMarkers = () => {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const user = useUserStore((s) => s.user);
  const group = useGroupStore((s) => s.group);
  const map = useMapStore((s) => s.map);

  // Create custom DOM element marker
  const createUserMarker = (
    user: User,
    isCurrent: boolean
  ): mapboxgl.Marker => {
    const el = document.createElement("div");
    el.className =
      "user-marker flex flex-col items-center justify-center gap-1";

    const avatarHtml = user.avatar
      ? `<img src="${user.avatar}" alt="${user.name || "User"}'s avatar"
           class="w-full h-full object-cover opacity-70" />`
      : `
        <div class="absolute inset-[1px] rounded-full border-2 border-gray-500 z-10 pointer-events-none"></div>
        <div class="w-full h-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-gray-500" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path d="M18 20a6 6 0 0 0-12 0" />
            <circle cx="12" cy="10" r="4" />
          </svg>
        </div>`;

    el.innerHTML = `
      <div class="relative rounded-full overflow-hidden border-2 border-white ${
        isCurrent ? "w-12 h-12 shadow-lg" : "w-10 h-10 shadow-md"
      }">
        ${avatarHtml}
      </div>
      <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">${
        isCurrent ? "You" : user.name
      }</span>`;

    return new mapboxgl.Marker(el);
  };

  // Clear all markers
  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  // Update markers whenever users/group/map changes
  useEffect(() => {
    if (!map) return;

    clearMarkers();

    const users: User[] = [];

    if (user?.location) users.push(user);
    if (group?.members?.length) {
      group.members.forEach((member) => {
        if (member.id !== user?.id && member.location) {
          users.push(member);
        }
      });
    }

    if (users.length === 1 && users[0].id === user?.id) {
      // If only the current user is present, center the map on their location
      centerOnLocation(users[0].location!);
    }

    users.forEach((u) => {
      const marker = createUserMarker(u, u.id === user?.id);
      marker
        .setLngLat([u.location!.longitude, u.location!.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [user, group, map]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => clearMarkers();
  }, []);
};
