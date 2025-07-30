"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { authApi } from "@/lib/apis/authAPI";
import axios from "axios";
import {
  sanitizeName,
  sanitizeEmail,
  validatePassword,
} from "@/utils/sanitize";

export default function SignUp() {
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignUp = async (formData: FormData) => {
    const rawName = formData.get("name") as string;
    const rawEmail = formData.get("email") as string;
    const password = formData.get("password") as string;

    const name = sanitizeName(rawName);
    const email = sanitizeEmail(rawEmail);
    const validPassword = validatePassword(password);

    if (!name) {
      setErrorMessage("Please enter a valid name");
      return;
    }

    if (!email) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    if (!validPassword.isValid) {
      setErrorMessage(validPassword.message);
      return;
    }

    try {
      await authApi.signup({ email, password, name });
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/account/subscribe",
      });
      if (res?.error) {
        setErrorMessage(res.error);
      } else if (res?.ok) {
        window.location.href = "/account/subscribe"; // Manual redirect after successful login
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setErrorMessage("An account with this email already exists.");
      } else {
        setErrorMessage("Failed to sign up. Please try again.");
      }
      // const error = err as Error & { error?: string };
      // throw new Error(error.error || "Failed to sign up");
    }
  };
///
  return (
    <>
      <div className="flex flex-col gap-8 md:flex-row md:gap-20 justify-center items-center flex-1 m-4 md:m-18">
        <div className="border-2 rounded-2xl px-10 py-12 flex flex-col content-center w-full max-w-md md:max-w-lg">
          <p className="text-center text-xl font-bold pb-8">Sign Up</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSignUp(formData);
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              id="name"
              name="name"
              className="border-b-1 border-gray-400 p-2"
              placeholder="Username"
              required
            />
            <input
              type="text"
              id="email"
              name="email"
              className="border-b-1 border-gray-400 p-2"
              placeholder="Email"
              required
            />
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              className="border-b-1 border-gray-400 p-2"
              required
            />

            {errorMessage && (
              <p className="text-red-500 text-sm text-center">{errorMessage}</p>
            )}

            <button
              className="border-1 border-gray-600 rounded-sm p-2 mt-8"
              type="submit"
            >
              Sign Up
            </button>
          </form>
          <button
            className="border border-gray-600 rounded-sm p-2 mt-4 flex justify-center items-center gap-2"
            onClick={() => {
              signIn("google", {
                redirect: true,
                callbackUrl: "/account/subscribe",
              });
            }}
          >
            <img className="w-1/9" src="google.png" alt="Google Logo" />
            <span>Sign up with Google</span>
          </button>
          <div className="flex justify-center items-center gap-4 mt-4">
            <p>Already a member?</p>
            <Link href="/" className="font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center flex-col gap-12 w-full max-w-md">
          <p className="text-3xl font-bold">Hello!</p>
          <img
            className="w-2/3"
            src="destination.png"
            alt="Destination Image"
          />
          <p>Sign up to access features.</p>
        </div>
      </div>
    </>
  );
}
