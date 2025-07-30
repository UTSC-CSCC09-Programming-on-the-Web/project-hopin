export function sanitizeString(input) {
  if (!input || typeof input !== "string") throw new Error("Empty input");

  // Reject html tags
  if (/<[^>]*>/g.test(input)) {
    throw new Error(`Invalid string: Contains HTML tags`);
  }

  if (/[<>]|&lt;|&gt;|&nbsp;|&quot|&#x27;/i.test(input)) {
    throw new Error("Suspicious input");
  }

  return input.trim().replace(/\s+/g, " ");
}

export function validateName(name) {
  const sanitized = sanitizeString(name);
  if (!sanitized || sanitized.length < 1) {
    throw new Error("Name is required");
  }

  const nameRegex = /^[a-z ,.'-]+$/i;
  if (!nameRegex.test(sanitized)) {
    throw new Error("Name contains invalid characters");
  }

  return sanitized;
}

export function validateEmail(email) {
  const sanitized = sanitizeString(email);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error("Invalid email format");
  }

  return sanitized;
}

export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    throw new Error("Password must include at least one lowercase character");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    throw new Error("Password must include at least one uppercase character");
  }

  if (!/(?=.*\d)/.test(password)) {
    throw new Error("Password must include at least one number");
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    throw new Error(
      "Password must include at least one special character (@$!%*?&)",
    );
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    throw new Error(
      "Password must include at least one special character (@$!%*?&)",
    );
  }

  return password;
}
