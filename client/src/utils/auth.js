// Helper to get current user from localStorage
export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem("eventure_user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
}

// Get user role, default to "user" if missing
export function getUserRole() {
  const user = getCurrentUser();
  return user?.role || "user";
}
