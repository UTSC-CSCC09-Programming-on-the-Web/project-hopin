"use client";

import { useState, useCallback } from "react";
import { UserCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { sanitizeName } from "@/utils/sanitize";
import { useUserStore } from "@/stores/UserStore";
import Image from "next/image";

interface FormData {
  name: string;
  email: string;
  avatar: File | string | null;
}

function UserAccount() {
  const { user, updateProfile, signOut, deleteAccount } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    avatar: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when user changes or editing starts
  const initializeFormData = useCallback(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
      setImagePreview(null);
      setImageLoadError(false);
    }
  }, [user]);

  // Handle profile update
  const handleProfileUpdate = async (formElement: HTMLFormElement) => {
    if (!user) {
      toast.error("User data not available");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData from the form element
      const data = new FormData(formElement);

      // Handle avatar file properly
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

      await updateProfile(data);

      // Reset form state after successful update
      setImagePreview(null);
      setImageLoadError(false);
      resetFileInput();
      setIsEditing(false);
    } catch (error) {
      // Error is already handled in UserContext with toast
      console.error("Profile update failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file change for avatar upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFormData((prev) => ({ ...prev, avatar: file }));

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  // Handle image click for editing
  const handleImageClick = useCallback(() => {
    if (isEditing) {
      document.getElementById("avatar-upload")?.click();
    }
  }, [isEditing]);

  // Reset file input
  const resetFileInput = useCallback(() => {
    const fileInput = document.getElementById(
      "avatar-upload",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }, []);

  // Handle edit mode toggle
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel editing - reset form data
      initializeFormData();
      resetFileInput();
    } else {
      // Start editing - initialize form with current user data
      initializeFormData();
    }
    setIsEditing(!isEditing);
  }, [isEditing, initializeFormData, resetFileInput]);

  // Handle sign out with confirmation
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      // Error handling is done in UserContext
      console.error("Sign out failed:", error);
    }
  }, [signOut]);

  // Handle account deletion with confirmation
  const handleDeleteAccount = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      await deleteAccount();
      handleSignOut();
    } catch (error) {
      // Error handling is done in UserContext
      console.error("Account deletion failed:", error);
    }
  }, [deleteAccount, handleSignOut]);

  // Loading state
  // if (loading && !currentUser) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[400px]">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
  //         <p className="text-gray-600">Loading profile...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // No user state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <UserCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
          {/* Avatar Section */}
          <div className="w-24 h-24 relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {isEditing ? (
              <div
                className="w-full h-full cursor-pointer relative flex items-center justify-center group"
                onClick={handleImageClick}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Avatar preview"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : user.avatar && !imageLoadError ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name || "User"}'s avatar`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <UserCircle2
                    className="w-full h-full text-gray-500"
                    strokeWidth={1}
                  />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
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
            ) : user.avatar && !imageLoadError ? (
              <img
                src={user.avatar}
                alt={`${user.name || "User"}'s avatar`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => {
                  console.error("Error loading avatar image");
                  setImageLoadError(true);
                }}
              />
            ) : (
              <UserCircle2
                className="w-full h-full text-gray-500"
                strokeWidth={1}
              />
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 w-full">
            {isEditing ? (
              /* Edit Form */
              <div>
                <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleProfileUpdate(e.currentTarget);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      htmlFor="name"
                    >
                      Username
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => {
                        const sanitized = sanitizeName(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          name: sanitized,
                        }));
                      }}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      htmlFor="email"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      className="w-full p-2 border rounded-md bg-gray-100 text-gray-500"
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Hidden field for existing avatar */}
                  {typeof formData.avatar === "string" &&
                    formData.avatar &&
                    !imagePreview && (
                      <input
                        type="hidden"
                        name="avatar"
                        value={formData.avatar}
                      />
                    )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* View Mode */
              <div className="flex flex-col items-center md:items-start">
                <h2 className="text-2xl font-bold mb-4">
                  {user.name || "User"}
                </h2>
                <div className="space-y-2 mb-6 text-center">
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span>{" "}
                    {user.email || "Not available"}
                  </p>
                  {user.location && (
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span>{" "}
                      {user.location.latitude.toFixed(4)},{" "}
                      {user.location.longitude.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-col md:flex-row">
                  <button
                    onClick={handleEditToggle}
                    className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Account() {
  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-50">
      <UserAccount />
    </div>
  );
}
