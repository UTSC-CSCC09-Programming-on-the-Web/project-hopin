"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { authApi } from "../../../lib/axios/authAPI";
import Header from "@/components/header";

export default function SignUp() {
  const handleSignUp = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authApi.signup({ email, password, name });
      window.location.href = "http://localhost:3000/account/subscribe"; // After signup, lead to monthly subscription page
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/home",
      });
    } catch (err) {
      const error = err as Error & { error?: string };
      throw new Error(error.error || "Failed to sign up");
    }
  };

  return (
    <>
      <Header />
      <div className="flex flex-wrap gap-20 justify-center items-center m-18 mt-0">
        <div className="border-2 rounded-2xl px-10 py-12 flex flex-col content-center w-full max-w-md">
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
