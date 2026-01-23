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

// Export getFetchOptions for use in other API calls
export { getFetchOptions };
