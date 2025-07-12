"use client";

function CheckoutSuccess() {
    return (
      <section>
        <div className="description Box-root">
          <h3>Subscription to Starter plan successful!</h3>
        </div>
        <form action="/create-portal-session" method="POST">
          <input type="hidden" id="session-id" name="session_id" value="" />
          <button id="checkout-and-portal-button" type="submit"
            onClick={()=> {
                // some state management
                // call checkout()
                /// .then (async (session) => {
                // })'
            }}>Manage your billing information</button>
        </form>
      </section>
    );
}

export default function Success() {
  return (
    <div>
        <CheckoutSuccess />
    </div>
  )
}