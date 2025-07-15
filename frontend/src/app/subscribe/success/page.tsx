"use client";

import { Suspense } from 'react';
import { paymentApi } from "../../../../lib/axios/paymentAPI";
import { useSearchParams } from 'next/navigation';
import { useUserContext } from '../../../../contexts/UserContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { currentUser } = useUserContext();
  return (
    <div>
      <h3>Subscription to starter plan successful!</h3>
      <form>
        <button
          type="button"
          className=''
          onClick={(e) => {
            e.preventDefault();
            if (sessionId && currentUser) {
              paymentApi.createPortalSession(currentUser.id, sessionId);
            } else {
              console.error('No session ID available');
            }
          }}>
          Manage billing information
        </button>
      </form>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}