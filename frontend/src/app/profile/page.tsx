"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { User } from "../../../types/user";
import { userApi } from "../api/userAPI";

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
      console.log("User is authenticated via NextAuth, using session data...");

      // Use session data directly
      const sessionUser = {
        id: session.user.id as string,
        name: session.user.name || "",
        email: session.user.email || "",
        avatar: "", // Will be loaded separately if needed
      };

      setUser(sessionUser);
      setFormData({
        name: sessionUser.name,
        email: sessionUser.email,
        avatar: sessionUser.avatar,
      });
      setError("");
      setLoading(false);
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
        // Reset form data to the updated user data (map backend fields to frontend fields)
        setFormData({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          avatar: updatedUser.avatar || "",
        });
        // Clear image preview
        setImagePreview(null);
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
      // Clear any image preview
      setImagePreview(null);

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
              ) : user && user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.name || "User"}'s avatar`}
                  className="w-full h-full object-cover opacity-70"
                />
              ) : (
                <span className="text-2xl font-bold opacity-70">
                  {user && user.name ? user.name!.charAt(0).toUpperCase() : ""}
                </span>
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
          ) : user && user.avatar ? (
            <>
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Error loading avatar image:", e);
                  // Fallback to initials if image fails to load
                  e.currentTarget.style.display = "none";
                  document
                    .getElementById("avatar-fallback")
                    ?.classList.remove("hidden");
                }}
              />
              <span id="avatar-fallback" className="text-2xl font-bold hidden">
                {user && user.name ? user.name!.charAt(0).toUpperCase() : ""}
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold">
              {user && user.name ? user.name!.charAt(0).toUpperCase() : ""}
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="w-full md:w-3/4">
            <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (user) {
                  handleProfileUpdate(user.email, e.currentTarget);
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
            <h2 className="text-2xl font-bold">{user ? user.name : ""}</h2>
            <p>
              <strong>Email:</strong> {user ? user.email : ""}
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
                  if (user && user.name) {
                    DeleteAccount(user.id, user.email);
                  } else {
                    alert("User ID unavailable.");
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
