import { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      setUserState(null);
      return;
    }
    const stored = localStorage.getItem("eventure_user");
    if (stored) {
      try {
        setUserState(JSON.parse(stored));
      } catch {
        setUserState(null);
      }
    }
    getProfile()
      .then((data) => {
        if (data?.user) {
          setUserState(data.user);
          localStorage.setItem("eventure_user", JSON.stringify(data.user));
        }
      })
      .catch(() => {
        // Keep existing stored user on profile fetch failure (e.g. network)
      });
  }, []);

  const setUser = (nextUser) => {
    setUserState(nextUser);
    if (nextUser) {
      localStorage.setItem("eventure_user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("eventure_user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** Current user from server (refreshed on load so role changes appear after refresh). */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

/** Current user role; defaults to "user" if not loaded. */
export function useUserRole() {
  const user = useCurrentUser();
  return user?.role ?? "user";
}
