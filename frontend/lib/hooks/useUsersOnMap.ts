"use client";

import { useEffect, useState } from "react";
import { User } from "../../types/user";
import { useUserContext } from "../../contexts/UserContext";
import mapboxgl from "mapbox-gl";
import { useGroupContext } from "../../contexts/GroupContext";

const useUsersOnMap = (map: mapboxgl.Map | null) => {
  const [usersOnMap, setUsersOnMap] = useState<Map<string, User>>(new Map());
  const { currentUser } = useUserContext();
  const { group } = useGroupContext();

  useEffect(() => {
    // If we have a group, we want to set all members on the map
    if (group) {
      setUsersOnMap((prev) => {
        const copy = new Map(prev);
        group.members.forEach((member) => {
          if (member.isReady) {
            copy.set(member.id, member);
          } else {
            copy.delete(member.id);
          }
        });
        return copy;
      });

      return;
    }

    if (!currentUser) return;
    // If no group, just set the current user
    setUsersOnMap((prev) => {
      const copy = new Map(prev);
      if (currentUser.isReady) {
        copy.set(currentUser.id, currentUser);
      } else {
        copy.delete(currentUser.id);
      }
      return copy;
    });
  }, [currentUser, group?.members]);

  useEffect(() => {
    updateUserMarkers(map, Array.from(usersOnMap.values()), currentUser);
  }, [usersOnMap, currentUser]);
};

export default useUsersOnMap;

const updateUserMarkers = (
  map: mapboxgl.Map | null,
  users: User[],
  currentUser: User | null
) => {
  if (!map || !location) return;

  // Clear old markers
  document.querySelectorAll(".user-marker").forEach((m) => m.remove());

  users.forEach((user) => {
    if (!user.location) return;

    // If this is the current user, we want to highlight their marker
    const isCurrentUser = currentUser && user.id === currentUser.id;

    // Create marker element
    const el = document.createElement("div");
    el.className =
      "user-marker flex flex-col items-center justify-center gap-1";

    // TODO: Replace with user's profile picture when available
    el.innerHTML = `
      <div class="relative rounded-full overflow-hidden border-2 border-white ${
        isCurrentUser ? "w-12 h-12 shadow-lg" : "w-10 h-10 shadow-md"
      }">
      <img src="${user.avatar}" />
      </div>
      <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">${
        isCurrentUser ? "You" : user.name
      }</span>
    `;

    new mapboxgl.Marker(el)
      .setLngLat([user.location.longitude, user.location.latitude])
      .addTo(map);
  });

  // If only the current user is present, center the map on their location
  if (
    users.length === 1 &&
    currentUser &&
    users[0].id === currentUser?.id &&
    currentUser.location
  ) {
    map.setCenter([
      currentUser.location.longitude,
      currentUser.location.latitude,
    ]);
  }
};
