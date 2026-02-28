import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../contexts/AuthContext";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("eventure_token");
  const user = useCurrentUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
