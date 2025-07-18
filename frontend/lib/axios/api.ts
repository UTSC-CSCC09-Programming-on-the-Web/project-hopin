import axios from "axios";
import { Session } from "next-auth";

// Api instance for unauthenticated requests
// This is used for public endpoints that do not require authentication
// such as fetching all users or public user profiles
export const getApi = () => {
  // Use internal Docker network URL for server-side calls, public URL for client-side
  const baseURL =
    typeof window === "undefined"
      ? process.env.SERVER_INTERNAL_URI || "http://backend:8080"
      : process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";

  const api = axios.create({
    baseURL: `${baseURL}/api`,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return api;
};

// This is used for endpoints that require authentication
export const getAuthenticatedApi = (session: Session | null) => {
  // Use internal Docker network URL for server-side calls, public URL for client-side
  const baseURL =
    typeof window === "undefined"
      ? process.env.SERVER_INTERNAL_URI || "http://backend:8080"
      : process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";

  const authenticatedApi = axios.create({
    baseURL: `${baseURL}/api`,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (session?.accessToken) {
    authenticatedApi.defaults.headers.common["Authorization"] =
      `Bearer ${session.accessToken}`;
  }

  return authenticatedApi;
};
