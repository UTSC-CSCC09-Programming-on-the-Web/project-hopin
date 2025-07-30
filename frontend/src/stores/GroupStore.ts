import { create } from "zustand";
import { Group, User } from "@/types/user";
import { groupApi } from "@/lib/apis/groupAPI";
import toast from "react-hot-toast";
import { Locatable } from "@/types/location";
import { Route } from "@/types/route";
import { fetchRoute } from "@/lib/apis/directionsAPI";
import { clearRoute } from "./MapStore";

interface GroupState {
  group?: Group;
  loadingGroup: boolean;
  // Indicates if the group's route is up-to-date
  // This is to signal to the driver that they can update the route
  // in case a new member joins or leaves
  isRouteUpToDate: boolean;
  setGroupRoute: (route: Route) => void;
  driverHeading: number | null; // Heading of the driver
  setGroup: (group: Group | undefined) => void;
  createGroup: () => Promise<string | undefined>;
  joinGroup: (groupId: string) => Promise<string | undefined>;
  leaveGroup: () => Promise<void>;
  getGroup: (groupId: string) => Promise<void>;
  becomeDriver: () => Promise<boolean>;
  unbecomeDriver: () => Promise<void>;
}

const dummyMembers: User[] = [
  {
    id: "dummy",
    name: "Dummy User",
    avatar: "",
    location: { latitude: 43.79038421339482, longitude: -79.19435176875646 },
    color: "#f28cb1",
    email: "dummy@dummymail.com",
  },
  {
    id: "dummy2",
    name: "Dummy User 2",
    avatar: "",
    location: { latitude: 43.79894108700009, longitude: -79.20164299123292 },
    color: "#3887be",
    email: "dummy2@dummymail.com",
  },
];

export const useGroupStore = create<GroupState>()((set, get) => ({
  group: undefined,
  isRouteUpToDate: true,
  loadingGroup: true,
  driverHeading: null,
  // FIXME: remove dummy member when done testing
  setGroup: (group) =>
    set({
      group: group
        ? {
            ...group,
            members: [...(group.members || []), ...dummyMembers],
          }
        : undefined,
    }),
  setGroupRoute: (route: Route) => {
    set((state) => {
      if (!state.group) return state;
      return {
        group: {
          ...state.group,
          route,
        },
        isRouteUpToDate: true,
      };
    });
  },
  createGroup: async () => {
    try {
      const newGroup = await groupApi.createGroup();
      if (!newGroup) {
        throw new Error("Failed to create group");
      }
      const { setGroup } = get();
      setGroup(newGroup);
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
      const { setGroup } = get();
      setGroup(joinedGroup);
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
      const { setGroup } = get();
      setGroup(fetchedGroup);
    } catch (error: unknown) {
      console.error("Failed to fetch group:", error);
      toast.error("Failed to fetch group. Please try again.");
    }
  },

  becomeDriver: async (): Promise<boolean> => {
    const { group } = get();
    if (!group) return false;

    try {
      const updated = await groupApi.becomeDriver(group.id);
      const { setGroup } = get();
      clearRoute("user");
      setGroup(updated);
      toast.success("You are now the driver of the group!");
      // FIXME: remove dummy members when done testing
      const members = [...(group.members || []), ...dummyMembers];
      const allLocations = [
        ...members,
        ...(members
          .map((m) =>
            m.destination ? { ...m.destination, color: m.color, id: m.id, name: m.name } : undefined
          )
          .filter(Boolean) as Locatable[]),
      ];

      await createGroupRoute(allLocations as Locatable[]);
      return true;
    } catch (error: unknown) {
      console.error("Failed to become driver:", error);
      toast.error("Failed to become driver. Please try again.");
      return false;
    }
  },

  unbecomeDriver: async () => {
    const { group } = get();
    if (!group) return;

    try {
      await groupApi.unbecomeDriver(group.id);
      const updated = await groupApi.updateGroupRoute(group.id, null);
      const { setGroup } = get();
      setGroup(updated);
      toast.success("You are no longer the driver of the group.");
      clearRoute("group");
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
      isRouteUpToDate: false, // New member means route needs to be updated
    };
  });
};

export const updateGroupMember = (user: User) => {
  useGroupStore.setState((state) => {
    if (!state.group) return state;

    // Handle case where user is the driver
    if (user.id === state.group.driver?.id) {
      return {
        group: {
          ...state.group,
          driver: user,
        },
      };
    }

    // Update member's data in the group
    const updatedMembers = state.group.members.map((m) =>
      m.id === user.id ? { ...m, ...user } : m,
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

    // If the user is the driver, we need to handle it differently
    if (userId === state.group.driver?.id) {
      // If the driver leaves, we need to clear the route and set the driver to null
      clearRoute("group");
      return {
        group: {
          ...state.group,
          driver: null,
        },
        isRouteUpToDate: false, // Driver leaving means route needs to be updated
      };
    }

    const filteredMembers = state.group.members.filter((m) => m.id !== userId);

    return {
      group: {
        ...state.group,
        members: filteredMembers,
      },
      isRouteUpToDate: false, // Member removed means route needs to be updated
    };
  });
};

export const getUserGroup = async () => {
  const { setGroup } = useGroupStore.getState();
  useGroupStore.setState({ loadingGroup: true });
  try {
    const group = await groupApi.getUserGroup();
    setGroup(group);
  } catch (error: unknown) {
    console.error("Failed to fetch user group:", error);
    toast.error("Failed to fetch your group. Please try again.");
  } finally {
    useGroupStore.setState({ loadingGroup: false });
  }
};

export const createGroupRoute = async (checkpoints: Locatable[]) => {
  const { group } = useGroupStore.getState();

  if (!group) {
    toast.error("Group not found.");
    return;
  }

  try {
    const route = await fetchRoute(checkpoints);
    // Updates the entire group's route, i.e. syncs with all members
    await groupApi.updateGroupRoute(group.id, route);
  } catch (error: unknown) {
    console.error("Failed to create group route:", error);
    toast.error("Failed to create group route. Please try again.");
  }
};

export const updateDriverHeading = (heading: number | null) => {
  useGroupStore.setState({ driverHeading: heading });
};
