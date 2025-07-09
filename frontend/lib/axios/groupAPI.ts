import { handleApiError } from "@/utils/apiUtils";
import { Group } from "../../types/user";
import { getAuthenticatedApi } from "./api";
import { AxiosError } from "axios";

export const groupApi = {
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
};
