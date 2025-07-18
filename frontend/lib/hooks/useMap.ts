"use client";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Coordinates } from "../../types/location";
import "mapbox-gl/dist/mapbox-gl.css";
import { User } from "../../types/user";
import { useUserContext } from "../../contexts/UserContext";
import { useGroupContext } from "../../contexts/GroupContext";

type UseMapReturnType = {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
  attachToContainer: (el: HTMLDivElement | null) => void;
  centerOnLocation: (location: Coordinates) => void;
  addUserMarkers: (users: User[], currentUser: User | null) => void;
  clearMarkers: () => void;
};

// Custom hook to manage Mapbox map instance and related functionalities
// Designed to work specifically with MapContext for centralized map management
export const useMap = (): UseMapReturnType => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [usersOnMap, setUsersOnMap] = useState<Map<string, User>>(new Map());

  const { currentUser } = useUserContext();
  const { group } = useGroupContext();

  // Memoized function to clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // Memoized function to attach map to container
  const attachToContainer = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;

    // Prevent multiple map instances
    if (mapRef.current) {
      const currentContainer = mapRef.current.getContainer();
      if (el.contains(currentContainer)) return;

      // Move existing map to new container
      el.innerHTML = "";
      el.appendChild(currentContainer);
      mapRef.current.resize();
      return;
    }

    // Create new map instance
    const map = new mapboxgl.Map({
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
      container: el,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-79.3832, 43.6532], // Default to Toronto
      zoom: 12,
    });

    // Set up map event handlers
    map.on("load", () => {
      setIsMapReady(true);
    });

    map.on("error", (e) => {
      console.error("Mapbox error:", e);
    });

    mapRef.current = map;
  }, []);

  // Memoized function to center map on location
  const centerOnLocation = useCallback(
    (location: Coordinates) => {
      if (!mapRef.current || !isMapReady) {
        console.warn("Map is not ready or initialized");
        return;
      }

      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
        essential: true,
      });
    },
    [isMapReady],
  );

  // Memoized function to add user markers
  const addUserMarkers = useCallback(
    (users: User[], currentUser: User | null) => {
      if (!mapRef.current || !isMapReady) {
        console.warn("Map is not ready or initialized");
        return;
      }

      // Clear existing markers
      clearMarkers();

      const newMarkers: mapboxgl.Marker[] = [];

      users.forEach((user) => {
        if (!user.location) return;

        const isCurrentUser = !!(currentUser && user.id === currentUser.id);
        const marker = createUserMarker(user, isCurrentUser);

        marker
          .setLngLat([user.location.longitude, user.location.latitude])
          .addTo(mapRef.current!);

        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;

      // Auto-center on current user if they're the only one visible
      if (
        users.length === 1 &&
        currentUser &&
        users[0].id === currentUser.id &&
        currentUser.location
      ) {
        centerOnLocation(currentUser.location);
      }
    },
    [isMapReady, clearMarkers, centerOnLocation],
  );

  // Update users on map based on group or current user
  useEffect(() => {
    if (group) {
      // Group mode: show ready members
      const updatedUsers = new Map<string, User>();
      group.members.forEach((member) => {
        if (member.isReady && member.location) {
          updatedUsers.set(member.id, member);
        }
      });
      setUsersOnMap(updatedUsers);
    } else if (currentUser?.location) {
      // Solo mode: show only current user
      const soloUser = new Map<string, User>();
      soloUser.set(currentUser.id, currentUser);
      setUsersOnMap(soloUser);
    } else {
      // No users to show
      setUsersOnMap(new Map());
    }
  }, [currentUser, group, group?.members]);

  // Update markers when users on map change
  useEffect(() => {
    if (!isMapReady) return;

    const users = Array.from(usersOnMap.values());
    addUserMarkers(users, currentUser);
  }, [usersOnMap, currentUser, isMapReady, addUserMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clearMarkers]);

  return {
    map: mapRef.current,
    isMapReady,
    attachToContainer,
    centerOnLocation,
    addUserMarkers,
    clearMarkers,
  };
};

// Helper function to create user markers
const createUserMarker = (
  user: User,
  isCurrentUser: boolean,
): mapboxgl.Marker => {
  const el = document.createElement("div");
  el.className = "user-marker flex flex-col items-center justify-center gap-1";

  const avatarHtml = user.avatar
    ? `
    <img
      src="${user.avatar}"
      alt="${user.name || "User"}'s avatar"
      class="w-full h-full object-cover opacity-70"
    />
    `
    : `
    <div class="absolute inset-[1px] rounded-full border-2 border-gray-500 z-10 pointer-events-none"></div>
      <div class="w-full h-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg"
            class="w-full h-full text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1">
          <path d="M18 20a6 6 0 0 0-12 0" />
          <circle cx="12" cy="10" r="4" />
        </svg>
      </div>
    `;

  el.innerHTML = `
    <div class="relative rounded-full overflow-hidden border-2 border-white ${
      isCurrentUser ? "w-12 h-12 shadow-lg" : "w-10 h-10 shadow-md"
    }">
      ${avatarHtml}
    </div>
    <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">${
      isCurrentUser ? "You" : user.name
    }</span>
  `;

  return new mapboxgl.Marker(el);
};
