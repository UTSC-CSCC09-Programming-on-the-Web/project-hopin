"use client";
import { loadStripe } from '@stripe/stripe-js';
import { useState } from "react";
import { paymentApi } from "../../../lib/axios/paymentAPI";
import { useUserContext } from '../../../contexts/UserContext';
import toast from "react-hot-toast";

export default function Subscribe() {
  const [isLoading, setLoading] = useState(false);
  const {currentUser} = useUserContext();
  return (
    <>
      <div className="" >
        <form>
          <h3>Standard</h3>
          <h5>$5.00 / month</h5>
          <button 
            type="button"
            className="" 
            onClick={(e)=>{
              e.preventDefault();
              setLoading(true);
              if (!currentUser) {
                console.log("Please log in to start a subscription plan.");
                return;
              }
              paymentApi.createCheckoutSession(currentUser.id, currentUser.email!, "price_1RlDmGPEdGwKucITXtzxQfQ5") // TODO: move to env
                .then(async (session) => {
                  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PKEY!);
                  if (stripe === null) return;
                  await stripe.redirectToCheckout({sessionId: session.id});
                })
                .catch((error) => {
                    toast.error("Error occurred with subscribing");
                })
                .finally(() => {
                    setLoading(false);
                })
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Subscribe'}
          </button>
        </form>
      </div>
      <div id="stripeErrorMsg"></div>
    </>
  );
}
