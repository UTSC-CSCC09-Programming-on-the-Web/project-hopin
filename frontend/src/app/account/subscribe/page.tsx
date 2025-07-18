"use client";

import { loadStripe } from "@stripe/stripe-js";
import { useState, useEffect } from "react";
import { paymentApi } from "../../../../lib/axios/paymentAPI";
import { useUserContext } from "../../../../contexts/UserContext";
import toast from "react-hot-toast";

function SubscriptionDetail() {
  const { currentUser } = useUserContext();
  const [isLoading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    if (currentUser?.subscriptionStatus === "active") {
      setLoading(true);
      paymentApi
        .getSubscriptionDetail(currentUser.id)
        .then((res) => {
          setSubscriptionData(res);
        })
        .catch((error) => {
          console.error("Error fetching subscription data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [currentUser]);

  if (currentUser?.subscriptionStatus === "active") {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Loading subscription details...
            </p>
          </div>
        </div>
      );
    }

    if (!subscriptionData) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-600">
              Unable to load subscription details.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Plan Info */}
            <div className="px-6 py-6">
              <span className="text-sm text-gray-500 bg-gray-100/50 p-1 pl-2 pr-2 rounded-full">
                Joined on{" "}
                {subscriptionData.startDate
                  ? new Date(
                      typeof subscriptionData.startDate === "number"
                        ? subscriptionData.startDate * 1000
                        : subscriptionData.startDate,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Unknown"}
              </span>
              <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-2 mt-4 ml-1">
                <span className="text-2xl font-bold text-gray-900">
                  {" "}
                  {subscriptionData.name[0].toUpperCase() +
                    subscriptionData.name.slice(1)}{" "}
                </span>
                <span className="text-lg text-gray-500 font-medium">
                  {subscriptionData.interval[0].toUpperCase() +
                    subscriptionData.interval.slice(1)}
                </span>
              </div>
              <div className="flex items-start text-gray-600 mb-2 ml-1">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">
                  Next payment of ${subscriptionData.amount} is on{" "}
                  {new Date(
                    subscriptionData.nextBillingDate,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 space-y-3">
              <button
                type="button"
                className="w-full bg-gray-100 text-wrap text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentUser && currentUser.id && currentUser.customerId) {
                    paymentApi.createPortalSession(
                      currentUser.id,
                      currentUser.customerId,
                    );
                  } else {
                    console.error("No session ID available");
                  }
                }}
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (currentUser?.subscriptionStatus === "paused") {
    console.log("Redirect to stripe customer portal");
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-600">
              Your subscription has been paused. Please visit the portal to
              manage your plan.
            </p>
          </div>
          <div className="px-6 pb-6">
            <button
              type="button"
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              onClick={(e) => {
                e.preventDefault();
                if (currentUser && currentUser.id && currentUser.customerId) {
                  paymentApi.createPortalSession(
                    currentUser.id,
                    currentUser.customerId,
                  );
                } else {
                  console.error("No session ID available");
                }
              }}
            >
              Manage Subscription
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Let's get you started.
            </h1>
            <p className="text-gray-600">
              You don't have an active subscription yet. Subscribe to unlock
              HopIn.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-4">
              <h3 className="text-2xl font-bold text-white">Standard</h3>
              <div className="flex items-baseline text-white">
                <span className="text-3xl font-bold">$5.00</span>
                <span className="text-xl ml-1 opacity-90">/ month</span>
              </div>
            </div>

            {/* Features */}
            <div className="px-6 py-6">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Create and join your friends to share rides
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">
                    See friends on map in real-time
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Automatic calculation of costs
                  </span>
                </li>
              </ul>
            </div>

            <div className="px-6 pb-6">
              <button
                type="button"
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                onClick={(e) => {
                  e.preventDefault();
                  setLoadingStripe(true);
                  if (!currentUser) {
                    console.log("Please log in to start a subscription plan.");
                    return;
                  }
                  paymentApi
                    .createCheckoutSession(
                      currentUser.id,
                      currentUser.email!,
                      "price_1RlDmGPEdGwKucITXtzxQfQ5",
                    ) // TODO: move to env
                    .then(async (session) => {
                      const stripe = await loadStripe(
                        process.env.NEXT_PUBLIC_STRIPE_PKEY!,
                      );
                      if (stripe === null) return;
                      await stripe.redirectToCheckout({
                        sessionId: session.id,
                      });
                    })
                    .catch((error) => {
                      toast.error("Error occurred with subscribing");
                    })
                    .finally(() => {
                      setLoadingStripe(false);
                    });
                }}
                disabled={isLoadingStripe}
              >
                {isLoadingStripe ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Subscribe Now"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default function Subscribe() {
  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-50">
      <SubscriptionDetail />
    </div>
  );
}
