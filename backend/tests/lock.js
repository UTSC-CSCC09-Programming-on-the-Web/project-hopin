import fetch from "node-fetch";

const URL = "http://localhost:8080/api/subscriptions/create-checkout-session";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization:
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZlZDg2Njk2LTY0NmItNGQ3YS05MWM1LWIxOGIwZDM2YmFhZCIsImVtYWlsIjoianVsaWV5ZWFobkBnbWFpbC5jb20iLCJpYXQiOjE3NTM1NDU1NjMsImV4cCI6MTc1MzU0OTE2M30.ELhfQ834FoduACwpctsKGjp_dDmAIVPiy6U2ydYx62o",
  Accept: "application/json, text/plain, */*",
};

const PAYLOAD = JSON.stringify({ plan: "standard" });
const CONCURRENCY = 50; // number of concurrent requests

let successCount = 0;
let lockedCount = 0;
let otherCount = 0;

async function sendRequest(id) {
  const start = Date.now();
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: HEADERS,
      body: PAYLOAD,
    });

    const elapsed = Date.now() - start;
    const text = await res.text();

    const timestamp = new Date().toISOString();
    if (res.status === 200 || res.status === 201) {
      successCount++;
      console.log(
        `[${timestamp}] #${id} - SUCCESS (${res.status}) - ${elapsed} ms`,
      );
    } else if (res.status === 403 && text.includes("LOCKED")) {
      lockedCount++;
      console.log(`[${timestamp}] #${id} - LOCKED (${res.status})`);
    } else {
      otherCount++;
      console.log(`[${timestamp}] #${id} - ERROR (${res.status}) - ${text}`);
    }
  } catch (err) {
    otherCount++;
    console.error(`#${id} - ERROR`, err);
  }
}

async function main() {
  const requests = [];
  console.log(`Sending ${CONCURRENCY} concurrent requests...`);
  for (let i = 1; i <= CONCURRENCY; i++) {
    requests.push(sendRequest(i));
  }
  await Promise.all(requests);

  console.log("\n--- Test Summary ---");
  console.log(`Total requests: ${CONCURRENCY}`);
  console.log(`Success: ${successCount}`);
  console.log(`Locked: ${lockedCount}`);
  console.log(`Other errors: ${otherCount}`);
}

main();
