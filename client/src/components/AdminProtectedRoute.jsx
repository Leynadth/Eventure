import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("eventure_token");
  const user = getCurrentUser();

  // Check if user is authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
