"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { userApi } from "../../../lib/axios/userAPI";

export default function PostLogIn() {
  const router = useRouter();

  useEffect(() => {
    const checkSubscription = async () => {
      userApi.isSubscribed().then(active => {
        if (active) router.push("/home");
        else router.push("/subscribe");
      })
    }
    checkSubscription();
  }, []);
  return <p>Redirecting...</p>
}
