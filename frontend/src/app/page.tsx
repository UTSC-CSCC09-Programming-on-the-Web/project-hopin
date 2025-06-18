"use client";
import React, { useEffect, useState } from "react";

function page() {
  const [message, setMessage] = useState("loading");
  useEffect(() => {
    fetch("http://localhost:8080/api/home")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setMessage(data.message);
      });
  }, []);
  return <div>{message}</div>;
}

export default page;
