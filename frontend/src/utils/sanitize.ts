import DOMPurify from "dompurify";

export function sanitizeText(input: string) {
  if (!input || typeof input !== "string") return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_ATTR: [],
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

export function sanitizeName(name: string) {
  const sanitized = sanitizeText(name).trim();
  const nameRegex = /^[a-z ,.'-]+$/i;
  return nameRegex.test(sanitized) ? sanitized : "";
}

export function sanitizeEmail(email: string) {
  const sanitized = sanitizeText(email).trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(sanitized) ? sanitized : "";
}

export function validatePassword(password: string) {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must include at least one lowercase character",
    };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must include at least one uppercase character",
    };
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: "Password must include at least one number",
    };
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return {
      isValid: false,
      message: "Password must include at least one special character (@$!%*?&)",
    };
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return {
      isValid: false,
      message: "Password must include at least one special character (@$!%*?&)",
    };
  }

  return { isValid: true, message: "Password is valid" };
}
