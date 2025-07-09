"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Group, User } from "../types/user";
import { useUserContext } from "./UserContext";
import { groupApi } from "../lib/axios/groupAPI";
import toast from "react-hot-toast";
import { useSocket } from "./SocketContext";
import { useRouter } from "next/navigation";

type GroupContextType = {
  group: Group | undefined;
  createGroup: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: () => void;
  getGroup: (groupId: string) => void;
  becomeDriver: () => void;
};

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { currentUser } = useUserContext();
  const [group, setGroup] = useState<Group | undefined>(undefined);

  const socket = useSocket();

  // At every refresh, check if the user is in a group
  useEffect(() => {
    const checkUserGroup = async () => {
      if (!currentUser) return;

      try {
        const userGroup = await groupApi.getUserGroup(currentUser.id);
        if (userGroup) {
          setGroup(userGroup);
          console.log("User is in a group:", userGroup);
        } else {
          console.log("User is not in any group");
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to fetch user group:", error);
          toast.error("Failed to fetch group information. Please try again.");
        }
      }
    };

    checkUserGroup();
  }, [currentUser]);

  useEffect(() => {
    if (!socket) {
      // Socket is not available (user not authenticated or not connected)
      console.log("Socket not available in GroupProvider");
      return;
    }

    console.log("Setting up socket listeners in GroupProvider");

    const handleJoinGroup = ({ groupId }: { groupId: string }) => {
      socket.emit("join_room", { groupId });
    };

    const handleNewMember = ({ user }: { user: User }) => {
      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: [...prev.members, user],
        };
      });
      toast.success(`${user.name} joined the group!`);
    };

    const handleMemberLeft = ({ userId }: { userId: string }) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const leavingMember = prev.members.find((m) => m.id === userId);
        if (leavingMember) {
          toast(`${leavingMember.name} left the group`);
        }
        return {
          ...prev,
          members: prev.members.filter((m) => m.id !== userId),
        };
      });
    };

    const handleGroupDeleted = () => {
      setGroup(undefined);
      toast("Group has been deleted");
      router.push("/home");
    };

    const handleDriverChanged = ({ driver }: { driver: User }) => {
      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          driver,
        };
      });
      toast.success(`${driver.name} is now the driver!`);
    };

    const handleUserStatusUpdate = ({
      user,
      updateType,
    }: {
      user: User;
      updateType: string;
    }) => {
      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((member) =>
            member.id === user.id ? { ...member, ...user } : member
          ),
        };
      });

      // Show notification for important status changes
      if (updateType === "readyStatusUpdate") {
        toast(`${user.name} is ${user.isReady ? "ready" : "not ready"}`);
      }
    };

    // Set up event listeners
    socket.on("join_group", handleJoinGroup);
    socket.on("new_member", handleNewMember);
    socket.on("member_left", handleMemberLeft);
    socket.on("group_deleted", handleGroupDeleted);
    socket.on("driver_changed", handleDriverChanged);
    socket.on("userStatusUpdate", handleUserStatusUpdate);

    return () => {
      console.log("Cleaning up socket listeners in GroupProvider");
      socket.off("join_group", handleJoinGroup);
      socket.off("new_member", handleNewMember);
      socket.off("member_left", handleMemberLeft);
      socket.off("group_deleted", handleGroupDeleted);
      socket.off("driver_changed", handleDriverChanged);
      socket.off("userStatusUpdate", handleUserStatusUpdate);
    };
  }, [socket, router]);

  // Helper function to join socket room when group is set
  useEffect(() => {
    if (socket && group) {
      console.log(`Joining socket room for group: ${group.id}`);
      socket.emit("joinGroup", group.id);
    }
  }, [socket, group]);

  const createGroup = useCallback(async () => {
    if (!currentUser) {
      console.error("No current user found. Cannot create group.");
      return;
    }

    try {
      const newGroup = await groupApi.createGroup();
      setGroup(newGroup);
      toast.success("Group created successfully!");
      router.push(`/group/${newGroup?.id}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Failed to create group:", error);
        toast.error("Failed to create group. Please try again.");
      }
    }
  }, [currentUser, router]);

  const joinGroup = useCallback(
    async (groupId: string) => {
      if (!currentUser) {
        console.error("No current user found. Cannot join group.");
        return;
      }

      try {
        const response = await groupApi.joinGroup(groupId);
        setGroup(response);
        toast.success("Successfully joined the group!");
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to join group:", error);
          toast.error("Failed to join group. Please try again.");
        }
      }
    },
    [currentUser]
  );

  const leaveGroup = useCallback(async () => {
    if (!currentUser || !group) {
      console.error("No current user or group found. Cannot leave group.");
      return;
    }

    try {
      const response = await groupApi.leaveGroup(group.id);
      setGroup(response);
      toast.success("Successfully left the group!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Failed to leave group:", error);
        toast.error("Failed to leave group. Please try again.");
      }
    }
  }, [currentUser, group]);

  const getGroup = useCallback(
    async (groupId: string) => {
      if (!currentUser) {
        console.error("No current user found. Cannot fetch group.");
        return;
      }

      try {
        const fetchedGroup = await groupApi.getGroup(groupId);
        setGroup(fetchedGroup);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to fetch group:", error);
          toast.error("Failed to fetch group. Please try again.");
        }
      }
    },
    [currentUser]
  );

  const becomeDriver = useCallback(async () => {
    if (!currentUser || !group) {
      console.error("No current user or group found. Cannot become driver.");
      return;
    }

    try {
      const updatedGroup = await groupApi.becomeDriver(group.id);
      setGroup(updatedGroup);
      toast.success("You are now the driver of the group!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Failed to become driver:", error);
        toast.error("Failed to become driver. Please try again.");
      }
    }
  }, [currentUser, group]);

  return (
    <GroupContext.Provider
      value={{
        group,
        createGroup,
        joinGroup,
        leaveGroup,
        getGroup,
        becomeDriver,
      }}
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
