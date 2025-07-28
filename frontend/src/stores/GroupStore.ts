import { create } from "zustand";
import { Group, User } from "@/types/user";
import { groupApi } from "@/lib/apis/groupAPI";
import toast from "react-hot-toast";

interface GroupState {
  group?: Group;
  loadingGroup: boolean;
  setGroup: (group: Group | undefined) => void;
  createGroup: () => Promise<string | undefined>;
  joinGroup: (groupId: string) => Promise<string | undefined>;
  leaveGroup: () => Promise<void>;
  getGroup: (groupId: string) => Promise<void>;
  becomeDriver: () => Promise<void>;
  unbecomeDriver: () => Promise<void>;
}

export const useGroupStore = create<GroupState>()((set, get) => ({
  group: undefined,
  loadingGroup: true,
  setGroup: (group) => set({ group }),

  createGroup: async () => {
    try {
      const newGroup = await groupApi.createGroup();
      if (!newGroup) {
        throw new Error("Failed to create group");
      }
      set({ group: newGroup });
      toast.success("Group created successfully!");
      return newGroup.id;
    } catch (error: unknown) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group. Please try again.");
    }
  },

  joinGroup: async (groupId: string) => {
    try {
      const joinedGroup = await groupApi.joinGroup(groupId);
      if (!joinedGroup) {
        throw new Error("Failed to join group");
      }
      set({ group: joinedGroup });
      toast.success("Successfully joined the group!");
      return joinedGroup.id;
    } catch (error: unknown) {
      console.error("Failed to join group:", error);
      toast.error("Failed to join group. Please try again.");
    }
  },

  leaveGroup: async () => {
    const { group } = get();
    if (!group) return;

    try {
      await groupApi.leaveGroup(group.id);
      set({ group: undefined });
      toast.success("Successfully left the group!");
    } catch (error: unknown) {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave group. Please try again.");
    }
  },

  getGroup: async (groupId: string) => {
    try {
      const fetchedGroup = await groupApi.getGroup(groupId);
      set({ group: fetchedGroup });
    } catch (error: unknown) {
      console.error("Failed to fetch group:", error);
      toast.error("Failed to fetch group. Please try again.");
    }
  },

  becomeDriver: async () => {
    const { group } = get();
    if (!group) return;

    try {
      const updated = await groupApi.becomeDriver(group.id);
      set({ group: updated });
      toast.success("You are now the driver of the group!");
    } catch (error: unknown) {
      console.error("Failed to become driver:", error);
      toast.error("Failed to become driver. Please try again.");
    }
  },

  unbecomeDriver: async () => {
    const { group } = get();
    if (!group) return;

    try {
      const updated = await groupApi.unbecomeDriver(group.id);
      set({ group: updated });
      toast.success("You are no longer the driver of the group.");
    } catch (error: unknown) {
      console.error("Failed to unbecome driver:", error);
      toast.error("Failed to unbecome driver. Please try again.");
    }
  },
}));

export const addGroupMember = (user: User) => {
  useGroupStore.setState((state) => {
    if (!state.group) return state;
    const existingMember = state.group.members.find((m) => m.id === user.id);
    if (existingMember) {
      return state; // User already a member, no need to add again
    }
    return {
      group: {
        ...state.group,
        members: [...state.group.members, user],
      },
    };
  });
};

export const updateGroupMember = (user: User) => {
  useGroupStore.setState((state) => {
    if (!state.group) return state;

    const updatedMembers = state.group.members.map((m) =>
      m.id === user.id ? { ...m, ...user } : m
    );

    return {
      group: {
        ...state.group,
        members: updatedMembers,
      },
    };
  });
};

export const removeGroupMember = (userId: string) => {
  useGroupStore.setState((state) => {
    if (!state.group) return state;

    const filteredMembers = state.group.members.filter((m) => m.id !== userId);

    return {
      group: {
        ...state.group,
        members: filteredMembers,
      },
    };
  });
};

export const getUserGroup = async () => {
  useGroupStore.setState({ loadingGroup: true });
  try {
    const group = await groupApi.getUserGroup();
    useGroupStore.setState({ group });
  } catch (error: unknown) {
    console.error("Failed to fetch user group:", error);
    toast.error("Failed to fetch your group. Please try again.");
  } finally {
    useGroupStore.setState({ loadingGroup: false });
  }
};
