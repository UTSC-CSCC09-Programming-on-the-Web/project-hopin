"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { User } from "../../../types/user";
import { userApi } from "../api/userAPI";
import { UserCircle2 } from "lucide-react";

function SignOut() {
  return Promise.all([
    // Clear custom JWT tokens
    userApi.signOut(),
    // Clear NextAuth session if it exists
    typeof window !== "undefined" &&
    (window as any).next &&
    (window as any).next.auth
      ? (window as any).next.auth.signOut()
      : Promise.resolve(),
  ])
    .then(() => {
      console.log("User signed out successfully from all sessions");
      // Force a full page reload to clear any cached state
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
      // Even if there's an error, try to navigate away
      alert("Sign out may have failed. Redirecting to home page.");
      window.location.href = "/";
    });
}

function DeleteAccount(userId: string, userEmail: string) {
  if (
    confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    )
  ) {
    return userApi
      .deleteUser(userId, userEmail)
      .then(() => {
        console.log("User account deleted successfully");
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error deleting account:", error);
        alert("Failed to delete account. Please try again.");
      });
  }
  return Promise.resolve();
}

function UserProfile() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: null as File | string | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Check NextAuth session status
    if (status === "loading") {
      return; // Still loading session
    }

    if (status === "unauthenticated" || !session) {
      console.log("Not authenticated via NextAuth");
      setError("User not authenticated. Please log in.");
      setIsAuth(false);
      setLoading(false);
      return;
    }

    // User is authenticated via NextAuth
    if (status === "authenticated" && session) {
      setIsAuth(true);
      console.log("User is authenticated via NextAuth, fetching latest user data...");

      // First set initial data from session
      const sessionUser = {
        id: session.user?.id || "",
        name: session.user?.name || "",
        email: session.user?.email || "",
        avatar: session.user?.image || session.user?.avatar || "", // Prefer image, fallback to avatar
      };

      setUser(sessionUser);
      setFormData({
        name: sessionUser.name,
        email: sessionUser.email,
        avatar: sessionUser.avatar,
      });
      setError("");
      setLoading(false);

      // Then fetch the latest user data from backend to get updated avatar
      if (sessionUser.email) {
        userApi
          .getCurrentUser(sessionUser.email)
          .then((backendUser) => {
            console.log("Backend user data:", backendUser);
            // Merge session data with backend data, preferring backend avatar
            const mergedUser = {
              ...sessionUser,
              ...backendUser,
              // Keep session data for fields that might not be in backend response
              id: backendUser.id || sessionUser.id,
              name: backendUser.name || sessionUser.name,
              email: backendUser.email || sessionUser.email,
              avatar: backendUser.avatar || sessionUser.avatar, // Prefer backend avatar
            };
            
            setUser(mergedUser);
            setFormData({
              name: mergedUser.name || "",
              email: mergedUser.email || "",
              avatar: mergedUser.avatar || "",
            });
          })
          .catch((error) => {
            console.error("Failed to fetch user data from backend:", error);
            // Continue using session data if backend fetch fails
          });
      }
    }
  }, [session, status]);

  if (loading) {
    return <p>Loading profile...</p>;
  }
  if (!isAuth && error) {
    return <p>{error}</p>;
  }
  if (!user && error) {
    return <p className="text-red-500">{"User data unavailable"}</p>;
  }

  const handleProfileUpdate = (
    userEmail: string,
    formElement: HTMLFormElement,
  ) => {
    setLoading(true);

    // Create FormData from the form element
    const data = new FormData(formElement);

    // Add the avatar file if it exists and is a File object
    if (formData.avatar instanceof File) {
      data.delete("avatar");
      data.append("avatar", formData.avatar);
    } else if (typeof formData.avatar === "string" && formData.avatar) {
      if (!data.get("avatar")) {
        data.append("avatar", formData.avatar);
      }
    } else {
      if (data.has("avatar") && !data.get("avatar")) {
        data.delete("avatar");
      }
    }

    userApi
      .updateProfile(userEmail, data)
      .then((updatedUser) => {
        setUser(updatedUser);
        // Reset form data to the updated user data (map localhost fields to frontend fields)
        setFormData({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          avatar: updatedUser.avatar || "",
        });
        // Clear image preview and reset image load error
        setImagePreview(null);
        setImageLoadError(false);
        // Reset file input
        const fileInput = document.getElementById(
          "avatar-upload",
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
        // Exit edit mode
        setIsEditing(false);
      })
      .catch((error) => {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const resetFormData = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
      // Clear any image preview and reset image load error
      setImagePreview(null);
      setImageLoadError(false);

      // Also reset the file input if it exists
      const fileInput = document.getElementById(
        "avatar-upload",
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  };

  // Copilot (lines 190-213)
  // Prompt: "When isEditing=true, I want the image area to be clickable to upload a new file"
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Set the file in the formData state
      setFormData({ ...formData, avatar: file });

      // Create a preview of the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    if (isEditing) {
      // Trigger the hidden file input
      document.getElementById("avatar-upload")?.click();
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
        <div className="w-24 h-24 relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {isEditing ? (
            // Copilot (lines 219-254)
            // Prompt: "When isEditing=true, I want the image area to be clickable to upload a new file"
            <div
              className="w-full h-full cursor-pointer relative flex items-center justify-center"
              onClick={handleImageClick}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : user?.avatar && !imageLoadError ? (
                <img
                  src={user.avatar}
                  alt={`${user.name || "User"}'s avatar`}
                  className="w-full h-full object-cover opacity-70"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <UserCircle2 className="size-full text-gray-500" strokeWidth={1} />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white text-xs opacity-0 hover:opacity-100 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mb-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Click to change</span>
              </div>
              <input
                id="avatar-upload"
                name="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : user?.avatar && !imageLoadError ? (
            <img
              src={user.avatar}
              alt={`${user.name || "User"}'s avatar`}
              className="w-full h-full object-cover"
              onError={() => {
                console.error("Error loading avatar image");
                setImageLoadError(true);
              }}
            />
          ) : (
            <UserCircle2 className="size-full text-gray-500" strokeWidth={1} />
          )}
        </div>

        {isEditing ? (
          <div className="w-full md:w-3/4">
            <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (user?.email) {
                  handleProfileUpdate(user.email, e.currentTarget);
                } else {
                  alert("User email is required to update profile.");
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    className="w-full p-2 border rounded bg-gray-100 text-gray-500"
                    disabled
                  />
                </div>
                {/* Copilot (lines 323-330)
                  Prompt: "When isEditing=true, I want the image area to be clickable to upload a new file" */}
                {/* If we have an existing avatar URL and no new file is selected, include it as a hidden field */}
                {typeof formData.avatar === "string" &&
                  formData.avatar &&
                  !imagePreview && (
                    <input
                      type="hidden"
                      name="avatar"
                      value={formData.avatar}
                    />
                  )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors ml-2"
                  onClick={() => {
                    resetFormData();
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-2 mt-4 md:mt-0">
            <h2 className="text-2xl font-bold">{user?.name || "User"}</h2>
            <p>
              <strong>Email:</strong> {user?.email || "Not available"}
            </p>
            <div className="mt-6 space-x-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={() => {
                  resetFormData();
                  setIsEditing(true);
                }}
              >
                Edit Profile
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={SignOut}
              >
                Sign Out
              </button>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                onClick={() => {
                  if (user?.id && user?.email) {
                    DeleteAccount(user.id, user.email);
                  } else {
                    alert("User ID and email are required to delete account.");
                  }
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <div className="container mx-auto p-4">
      <UserProfile />
    </div>
  );
}

// TO DO:
// - Loading wheel
