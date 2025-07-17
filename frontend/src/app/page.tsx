// import { getUserSession } from "@/lib/session";
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import HopinLogo from "../components/hopin-logo";

export default function SignIn() {
  // const user = await getUserSession();
  const handleSignIn = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signIn("credentials", {
        email: email,
        password: password,
        redirect: true,
        callbackUrl: "/home",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message || "Failed to sign in");
      } else {
        throw new Error("Failed to sign in");
      }
    }
  };

  return (
    <main>
      <HopinLogo />

      <div className="flex flex-wrap gap-20 justify-center items-center m-18">
        <div className="border-2 rounded-2xl px-10 py-12 flex flex-col content-center w-full max-w-md">
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
            <div className="flex flex-row justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">Remember me</span>
              </label>
              <a className="text-sm text-black">Forgot Password?</a>
            </div>

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
          <p className="text-3xl font-bold">Welcome Back!</p>
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
