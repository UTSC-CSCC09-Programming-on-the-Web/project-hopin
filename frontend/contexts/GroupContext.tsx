"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { User, Group } from "../types/user";
import { useUserContext } from "./UserContext";
import { userApi } from "@/app/api/userAPI";

type GroupContextType = {
  group: Group | null;
  createGroup: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: () => void;
};

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { currentUser } = useUserContext();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  // Fetch members of the group when component mounts
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        userApi.getAllUsers()
          .then((res) => {
            return res.users.filter(user => { user.id !== currentUser?.id });
          }).then((members) => { setMembers(members) })
      } catch (error) {
        console.error("Failed to fetch members.");
      }
    }

    if (currentUser) fetchMembers();
  }, [currentUser]);

  const createGroup = () => {
    if (!currentUser) {
      console.error("No current user found. Cannot create group.");
      return;
    }

    // Generate a new group ID three letters dash three numbers
    // TODO: replace with API call to create a group
    const newGroupId = `${Math.random()
      .toString(36)
      .substring(2, 5)}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    setGroup({
      id: newGroupId,
      owner: currentUser,
      driver: {
        id: "1",
        name: "John Doe",
        location: { longitude: -79.3822, latitude: 43.6532 },
        isReady: true,
      },
      members: [
        {
          ...currentUser,
          isReady: true,
        },
        // TODO: Sample members, replace with actual API call to fetch members
        {
          id: "1",
          name: "John Doe",
          location: { longitude: -79.3822, latitude: 43.6532 },
          isReady: true,
        },
        {
          id: "2",
          name: "Jessica Smith",
          location: { longitude: -118.2437, latitude: 34.0522 },
          isReady: true,
        },
      ],
    });
  };

  const joinGroup = (groupId: string) => {
    // TODO: replace with API call to join a group
    // Logic to join a group
    console.log(`Joining group with ID: ${groupId}`);
    // setGroupId(groupId);
  };

  const leaveGroup = () => {
    // TODO: replace with API call to leave a group
    // ! IMPORTANT: Transfer ownership if the current user is the owner
    // Logic to leave the group
    console.log("Leaving group...");
    setGroup(null);
  };

  return (
    <GroupContext.Provider
      value={{ group, createGroup, joinGroup, leaveGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroupContext must be used within a GroupProvider");
  }
  return context;
};
