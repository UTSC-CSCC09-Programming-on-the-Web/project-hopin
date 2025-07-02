export async function signup({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const res = await fetch("http://localhost:8080/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Signup failed.");
  }

  return res.json();
}

export async function signin({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const res = await fetch("http://localhost:8080/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Signin failed.");
  }

  const data = await res.json();
  // Store the JWT token in localStorage
  if (data.token) {
    localStorage.setItem("authToken", data.token);
  }

  return data;
}
