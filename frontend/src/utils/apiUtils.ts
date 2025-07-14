// Helper function to get authenticated axios instance with session token

import { AxiosError } from "axios";

// Helper function to handle axios errors
export const handleApiError = (error: AxiosError): never => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data || error.message;

    if (status === 404) {
      throw new Error("Resource not found. Please refresh and try again.");
    } else if (status === 403) {
      throw new Error("You are not authorized to perform this action.");
    } else if (status === 401) {
      throw new Error("Authentication required. Please sign in again.");
    } else {
      throw new Error(`Request failed: ${status} - ${message}`);
    }
  } else if (error.request) {
    throw new Error(
      "Network error. Please check your connection and try again."
    );
  } else {
    throw new Error(`Request error: ${error.message}`);
  }
};
