import axios from "axios";
import { Session } from "next-auth";

// Api instance for unauthenticated requests
// This is used for public endpoints that do not require authentication
// such as fetching all users or public user profiles
export const getApi = () => {
  const api = axios.create({
    baseURL: `${
      process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080"
    }/api`,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return api;
};

// This is used for endpoints that require authentication
export const getAuthenticatedApi = (session: Session | null) => {
  const authenticatedApi = axios.create({
    baseURL: `${
      process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080"
    }/api`,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (session?.accessToken) {
    authenticatedApi.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${session.accessToken}`;
  }

  return authenticatedApi;
};
