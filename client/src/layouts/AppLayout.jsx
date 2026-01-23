import { Outlet } from "react-router-dom";
import NavBar from "../components/layout/NavBar";

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <Outlet />
    </div>
  );
}

export default AppLayout;
