"use client";
import { loadStripe } from '@stripe/stripe-js';
import { useState } from "react";
import { paymentApi } from "../../../lib/axios/paymentAPI";
import toast from "react-hot-toast";

export default function Subscribe() {
  const [isLoading, setLoading] = useState(false);
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
              paymentApi.createCheckoutSession("price_1RjN3wPEdGwKucITLv9t6SGq") // TODO: move to env
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
// TODO: autofill/lock email used in checkout
// TODO: UI
// TODO: payment with authentication
// TODO: configure stripe customer portal 
