import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useUserStore } from "@/stores/UserStore";
import { useGroupStore } from "@/stores/GroupStore";
import { centerOnLocation, useMapStore } from "@/stores/MapStore";
import { User } from "@/types/user";

// Custom hook to manage user markers on the map
export const useUserMarkers = () => {
  const userMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const user = useUserStore((s) => s.user);
  const { group, driverHeading } = useGroupStore();
  const map = useMapStore((s) => s.map);

  // Helper functions
  const clearUserMarkers = useCallback(() => {
    userMarkersRef.current.forEach((marker) => marker.remove());
    userMarkersRef.current = [];
  }, []);

  const clearDriverMarker = useCallback(() => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, []);

  const clearAllMarkers = useCallback(() => {
    clearUserMarkers();
    clearDriverMarker();
  }, [clearUserMarkers, clearDriverMarker]);

  const addMarkerToMap = useCallback(
    (marker: mapboxgl.Marker, user: User) => {
      if (!user.location || !map) return null;

      return marker
        .setLngLat([user.location.longitude, user.location.latitude])
        .addTo(map);
    },
    [map]
  );

  const getVisibleUsers = useCallback(() => {
    if (!group?.members) return user?.location ? [user] : [];

    const visibleUsers: User[] = [];

    // If current user is the driver, don't show user marker - only driver marker will be shown
    const isCurrentUserDriver = user?.id === group?.driver?.id;

    // Add current user if they have location
    if (!isCurrentUserDriver && user?.location) {
      visibleUsers.push(user);
    }

    // Add other group members (excluding driver and current user)
    const otherMembers = group.members.filter(
      (member) =>
        member.id !== user?.id &&
        member.id !== group.driver?.id &&
        member.location
    );

    visibleUsers.push(...otherMembers);
    return visibleUsers;
  }, [user, group?.members, group?.driver?.id]);

  // Handle user markers (current user + group members, excluding driver)
  useEffect(() => {
    if (!map) return;

    clearUserMarkers();

    const visibleUsers = getVisibleUsers();

    // Auto-center map if only current user is visible
    if (
      visibleUsers.length === 1 &&
      visibleUsers[0].id === user?.id &&
      user.location
    ) {
      centerOnLocation(user.location);
    }

    // Create markers for all visible users
    visibleUsers.forEach((u) => {
      const marker = createUserMarker(u, u.id === user?.id);
      const addedMarker = addMarkerToMap(marker, u);
      if (addedMarker) {
        userMarkersRef.current.push(addedMarker);
      }
    });
  }, [
    map,
    user,
    group?.members,
    group?.driver?.id,
    getVisibleUsers,
    addMarkerToMap,
    clearUserMarkers,
  ]);

  // Handle driver marker separately
  useEffect(() => {
    if (!map) return;

    clearDriverMarker();

    if (group?.driver?.location) {
      const isCurrentUserDriver = user?.id === group?.driver?.id;
      const driverMarker = createDriverMarker(
        group.driver,
        driverHeading,
        isCurrentUserDriver
      );
      const addedMarker = addMarkerToMap(driverMarker, group.driver);
      if (addedMarker) {
        driverMarkerRef.current = addedMarker;
      }
    }
  }, [
    map,
    group?.driver,
    driverHeading,
    user?.id,
    addMarkerToMap,
    clearDriverMarker,
  ]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => clearAllMarkers();
  }, [clearAllMarkers]);
};

// Create custom DOM element marker for users
const createUserMarker = (user: User, isCurrent: boolean): mapboxgl.Marker => {
  const el = document.createElement("div");
  el.className = "user-marker flex flex-col items-center justify-center gap-1";

  const markerSize = isCurrent ? "w-12 h-12" : "w-10 h-10";
  const shadowClass = isCurrent ? "shadow-lg" : "shadow-md";
  const labelText = isCurrent ? "You" : user.name;

  const avatarContent = user.avatar
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
    <div class="relative rounded-full overflow-hidden border-2 border-white ${markerSize} ${shadowClass}">
      ${avatarContent}
    </div>
    <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">${labelText}</span>`;

  return new mapboxgl.Marker(el, {
    anchor: "center",
    offset: [0, 12], // Offset downward to center the avatar circle on the location
  });
};

// Create custom DOM element marker for driver
const createDriverMarker = (
  driver: User,
  heading: number | null,
  isCurrentUser: boolean = false
): mapboxgl.Marker => {
  const el = document.createElement("div");
  el.className =
    "driver-marker flex flex-col items-center justify-center gap-1";

  const carImg = document.createElement("img");
  carImg.src = "/car.png";
  carImg.style.width = "50px";
  carImg.style.transform = `rotate(${heading || 0}deg)`;
  carImg.style.transformOrigin = "center";
  carImg.alt = `${driver.name || "Driver"}'s car marker`;

  const nameLabel = document.createElement("span");
  nameLabel.className =
    "label-sm bg-white text-gray-900 px-1 shadow-xs rounded";
  nameLabel.textContent = isCurrentUser
    ? "You (Driver)"
    : `${driver.name || "Driver"}`;

  el.appendChild(carImg);
  el.appendChild(nameLabel);

  return new mapboxgl.Marker(el, {
    anchor: "center",
    offset: [0, 10], // Offset downward to center the car image on the location
  });
};
