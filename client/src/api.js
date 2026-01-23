const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const baseUrl = `${API_URL}/api`;

// Get authentication token from localStorage
function getAuthToken() {
  return localStorage.getItem("eventure_token");
}

// Build fetch options with Authorization header if token exists
function getFetchOptions(customOptions = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...customOptions.headers,
  };

  // Attach Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...customOptions,
    headers,
    credentials: "include",
  };
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

export async function login(email, password) {
  try {
    const emailNormalized = normalizeEmail(email);
    const response = await fetch(`${baseUrl}/auth/login`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify({ email: emailNormalized, password }),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

export async function register({ firstName, lastName, email, password, role }) {
  try {
    const emailNormalized = normalizeEmail(email);
    const body = { firstName, lastName, email: emailNormalized, password };
    if (role) body.role = role;

    const response = await fetch(`${baseUrl}/auth/register`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify(body),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

export async function logout() {
  try {
    const response = await fetch(`${baseUrl}/auth/logout`, {
      ...getFetchOptions(),
      method: "POST",
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

export async function forgotPassword(email) {
  try {
    const emailNormalized = normalizeEmail(email);
    const response = await fetch(`${baseUrl}/auth/forgot-password`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify({ email: emailNormalized }),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

export async function resetPasswordWithCode(email, code, newPassword) {
  try {
    const emailNormalized = normalizeEmail(email);
    const response = await fetch(`${baseUrl}/auth/reset-password-with-code`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify({
        email: emailNormalized,
        code: String(code),
        newPassword,
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

// Verify reset code
export async function verifyResetCode({ email, code }) {
  try {
    const emailNormalized = normalizeEmail(email);
    const response = await fetch(`${baseUrl}/auth/verify-reset-code`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify({
        email: emailNormalized,
        code: String(code),
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

// Reset password using /api/auth/reset-password endpoint
export async function resetPassword({ email, code, newPassword }) {
  try {
    const emailNormalized = normalizeEmail(email);
    const response = await fetch(`${baseUrl}/auth/reset-password`, {
      ...getFetchOptions(),
      method: "POST",
      body: JSON.stringify({
        email: emailNormalized,
        code: String(code),
        newPassword,
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

function toQueryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

// Fetch events
export async function getEvents(params) {
  try {
    const response = await fetch(`${baseUrl}/events${toQueryString(params)}`, {
      ...getFetchOptions(),
      method: "GET",
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

export async function getEventById(id) {
  try {
    const response = await fetch(`${baseUrl}/events/${id}`, {
      ...getFetchOptions(),
      method: "GET",
    });

    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to server. Please check if the server is running.");
    }
    throw error;
  }
}

// Export getFetchOptions for use in other API calls
export { getFetchOptions };
