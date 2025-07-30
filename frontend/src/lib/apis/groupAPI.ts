import { handleApiError } from "@/utils/apiUtils";
import { Group } from "@/types/user";
import { getAuthenticatedApi } from "./api";
import { AxiosError } from "axios";
import { MapBoxRoute, Route } from "@/types/route";

export const groupApi = {
  getUserGroup: async () => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.get<Group>(`/users/me/group`)
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return undefined;
      }
      console.error("Error fetching user group:", error);
      handleApiError(error as AxiosError);
    }
  },

  createGroup: async () => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.post<Group>("/groups/")
      );
      return response.data;
    } catch (error) {
      console.error("Error creating group:", error);
      handleApiError(error as AxiosError);
    }
  },

  joinGroup: async (groupId: string) => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.post<Group>(`/groups/${groupId}/join`)
      );
      return response.data;
    } catch (error) {
      console.error("Error joining group:", error);
      handleApiError(error as AxiosError);
    }
  },
  leaveGroup: async (groupId: string) => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.post<Group>(`/groups/${groupId}/leave`)
      );
      return response.data;
    } catch (error) {
      console.error("Error leaving group:", error);
      handleApiError(error as AxiosError);
    }
  },
  getGroup: async (groupId: string) => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.get<Group>(`/groups/${groupId}`)
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching group:", error);
      handleApiError(error as AxiosError);
    }
  },
  becomeDriver: async (groupId: string) => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.post<Group>(`/groups/${groupId}/become-driver`)
      );
      return response.data;
    } catch (error) {
      console.error("Error becoming driver:", error);
      handleApiError(error as AxiosError);
    }
  },
  unbecomeDriver: async (groupId: string) => {
    try {
      const response = await getAuthenticatedApi().then((api) =>
        api.post<Group>(`/groups/${groupId}/unbecome-driver`)
      );
      return response.data;
    } catch (error) {
      console.error("Error unbecoming driver:", error);
      handleApiError(error as AxiosError);
    }
  },
  updateGroupRoute: async (groupId: string, route: Route | null) => {
    try {
      if (route === null) {
        const response = await getAuthenticatedApi().then(
          (api) => api.put<Group>(`/groups/${groupId}/route`) // no body
        );
        return response.data;
      }

      const slimmedRoute = {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        checkpoints: route.checkpoints,
      };

      const response = await getAuthenticatedApi().then((api) =>
        api.put<Group>(`/groups/${groupId}/route`, slimmedRoute)
      );
      return response.data;
    } catch (error) {
      console.error("Error updating group route:", error);
      handleApiError(error as AxiosError);
    }
  },
};
