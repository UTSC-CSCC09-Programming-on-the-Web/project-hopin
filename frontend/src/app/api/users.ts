const AUTH_API_URL = "http://localhost:8080/api/auth";
const USER_API_URL = "http://localhost:8080/api/users";

// Helper function to get the auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to decode JWT token and extract user ID
const decodeJWT = (token: string): { id: number; email: string } | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, email: payload.email };
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Helper function to validate if a user exists in the database
const validateUserExists = async (userId: number): Promise<boolean> => {
  try {
    const response = await fetch(`${USER_API_URL}/${userId}`);
    return response.ok;
  } catch (error) {
    console.error("Error validating user existence:", error);
    return false;
  }
};

// Helper function to get a fresh JWT token for the current user
const getOrRefreshToken = async (userEmail: string): Promise<string | null> => {
  try {
    console.log("=== getOrRefreshToken called ===");
    console.log("User email provided:", userEmail);

    // First check if we have a valid token in localStorage
    const existingToken = localStorage.getItem("authToken");
    console.log(
      "Existing token in localStorage:",
      existingToken ? "present" : "missing",
    );

    if (existingToken) {
      // Decode the token and validate the user exists
      const decoded = decodeJWT(existingToken);
      if (decoded) {
        console.log("Decoded token contains user ID:", decoded.id);
        const userExists = await validateUserExists(decoded.id);
        console.log("User exists in database:", userExists);

        if (userExists) {
          return existingToken;
        } else {
          console.log("User from token does not exist, clearing stale token");
          localStorage.removeItem("authToken");
        }
      } else {
        console.log("Invalid token format, clearing");
        localStorage.removeItem("authToken");
      }
    }

    // If no valid token, get a fresh one using the user's email
    console.log("Getting fresh token for user:", userEmail);
    const response = await fetch(`${AUTH_API_URL}/get-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!response.ok) {
      console.error("Failed to get fresh token:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Get-token response:", data);
    if (data.token) {
      localStorage.setItem("authToken", data.token);
      return data.token;
    }

    return null;
  } catch (error) {
    console.error("Error getting/refreshing auth token:", error);
    return null;
  }
};

// Auth-related API functions
export const userApi = {
  checkAuthStatus: async (userEmail?: string) => {
    let headers: Record<string, string> = {};

    // If userEmail is provided, try to get/refresh token
    if (userEmail) {
      const token = await getOrRefreshToken(userEmail);
      if (token) {
        headers = { Authorization: `Bearer ${token}` };
      }
    } else {
      // Fallback to existing token in localStorage
      headers = getAuthHeader();
    }

    return fetch(`${AUTH_API_URL}/auth-status`, {
      method: "GET",
      headers: headers,
    })
      .then((res) => {
        if (res.status === 401) {
          return {
            authenticated: false,
            userData: null,
            status: 401,
            message: "Not authenticated",
          };
        }

        if (!res.ok) throw new Error("Auth status check failed");
        return res.json();
      })
      .then((data) => {
        return {
          authenticated: data.authenticated || false,
          userData: data.userId ? { id: data.userId } : null,
          status: 200,
          message: "Request successful",
        };
      })
      .catch((error: Error) => {
        console.error("Auth check error:", error);
        return {
          authenticated: false,
          userData: null,
          status: 500,
          message: error.message || "Authentication check failed",
        };
      });
  },

  getCurrentUser: async (userEmail: string) => {
    const token = await getOrRefreshToken(userEmail);
    if (!token) {
      throw new Error(
        "Authentication token not available. Please sign in again.",
      );
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    return fetch(`${AUTH_API_URL}/me`, {
      method: "GET",
      headers: headers,
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to get user data:", res.status, res.statusText);
          return res.text().then((text) => {
            console.error("Response body:", text);
            throw new Error(
              `Failed to get user data: ${res.status} ${res.statusText} - ${text}`,
            );
          });
        }
        return res.json();
      })
      .then((userData) => {
        return userData;
      })
      .catch((error: Error) => {
        console.error("Get user error:", error);
        throw error;
      });
  },

  updateUser: async (userData: FormData, userEmail: string) => {
    const token = await getOrRefreshToken(userEmail);
    if (!token) {
      throw new Error(
        "Authentication token not available. Please sign in again.",
      );
    }

    // Decode the token to get the actual user ID
    let userId;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.id;
      console.log("Decoded user ID from token:", userId);
    } catch (error) {
      console.error("Error decoding token:", error);
      throw new Error("Invalid authentication token. Please sign in again.");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    return fetch(`${USER_API_URL}/${userId}`, {
      method: "PATCH",
      headers: headers,
      body: userData,
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to update user:", res.status, res.statusText);
          // Try to get error message from response body
          return res.text().then((text) => {
            console.error("Response body:", text);
            let errorMessage = `Failed to update user: ${res.status} ${res.statusText}`;

            if (res.status === 404) {
              errorMessage =
                "User not found. This may be due to a stale authentication session. Please sign out and sign in again.";
            } else if (res.status === 403) {
              errorMessage =
                "You are not authorized to update this profile. Please make sure you are signed in as the correct user.";
            } else if (text) {
              errorMessage += ` - ${text}`;
            }

            throw new Error(errorMessage);
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("Update user response:", data);
        return data;
      })
      .catch((error: Error) => {
        console.error("Update user error:", error);
        throw error;
      });
  },

  signOut: async () => {
    try {
      // Call backend signout endpoint
      const res = await fetch(`${AUTH_API_URL}/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });

      if (!res.ok) {
        console.warn(
          "Backend signout failed, but continuing with client cleanup",
        );
      }
    } catch (error) {
      console.warn("Backend signout error:", error);
    }

    // Client-side cleanup - Clear ALL authentication tokens and sessions
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("refreshToken");

    // Clear any NextAuth related items
    localStorage.removeItem("next-auth.session-token");
    localStorage.removeItem("next-auth.callback-url");
    localStorage.removeItem("next-auth.csrf-token");

    // Clear cookies by setting them to expire (for NextAuth)
    if (typeof document !== "undefined") {
      document.cookie =
        "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    return { message: "Signed out successfully" };
  },

  deleteUser: async (userId: number, userEmail: string) => {
    const token = await getOrRefreshToken(userEmail);
    if (!token) {
      throw new Error(
        "Authentication token not available. Please sign in again.",
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    return fetch(`${USER_API_URL}/${userId}`, {
      method: "DELETE",
      headers: headers,
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to delete user:", res.status, res.statusText);
          // Try to get error message from response body
          return res.text().then((text) => {
            console.error("Response body:", text);
            throw new Error(
              `Failed to delete user: ${res.status} ${res.statusText} - ${text}`,
            );
          });
        }
        // The API returns 204 No Content, so we don't try to parse JSON
        if (res.status === 204) {
          return { success: true };
        }
        return res.json();
      })
      .catch((error: Error) => {
        console.error("Delete user error:", error);
        throw error;
      });
  },
};
