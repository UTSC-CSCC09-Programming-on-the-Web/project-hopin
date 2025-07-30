// import { getUserSession } from "@/lib/session";
"use client";

import HopinLogo from "@/components/hopin-logo";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
export default function SignIn() {
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const res = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false,
      });

      console.log("SignIn response:", res);

      if (res?.error) {
        setErrorMessage(res.error);
      } else if (res?.ok) {
        window.location.href = "/home";
      }
    } catch (error: unknown) {
      console.error("SignIn error:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message || "Failed to sign in");
      } else {
        setErrorMessage("Failed to sign in");
      }
    }
  };
  //
  return (
    <main className="min-h-screen flex flex-col">
      <HopinLogo />
      <div className="flex flex-col gap-8 md:flex-row md:gap-20 justify-center items-center flex-1 m-4 md:m-18">
        <div className="border-2 rounded-2xl px-10 py-12 flex flex-col content-center w-full max-w-md md:max-w-lg">
          <p className="text-center text-xl font-bold pb-8">Sign In</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSignIn(formData);
            }}
            className="flex flex-col gap-4"
          >
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
              Sign In
            </button>
          </form>
          <button
            className="border-1 border-gray-600 rounded-sm p-2 mt-4 flex justify-center items-center gap-2"
            onClick={() => signIn("google", { callbackUrl: "/home" })}
          >
            <img className="w-1/9" src="google.png" alt="Google Logo" />
            <span>Sign in with Google</span>
          </button>
          <div className="flex justify-center items-center gap-4 mt-4">
            <p>New member?</p>
            <Link href="/signup" className="font-bold hover:underline">
              Sign Up
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center flex-col gap-12 w-full max-w-md">
          <p className="text-2xl md:text-3xl font-bold">Welcome Back!</p>
          <img
            className="w-2/3"
            src="destination.png"
            alt="Destination Image"
          />
          <p>Sign in to access features.</p>
        </div>
      </div>
    </main>
  );
}
