import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../api";
import { getCurrentUser } from "../../utils/auth";
import RoleBadge from "../ui/RoleBadge";

function NavBar() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isLoggedIn = !!user;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("eventure_token");
      localStorage.removeItem("eventure_user");
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={isLoggedIn ? "/" : "/browse"} className="flex items-center">
            <img 
              src="/eventure-logo.png" 
              alt="Eventure" 
              className="h-14 w-auto shrink-0"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {isLoggedIn && (
              <Link
                to="/"
                className="text-sm font-medium text-[#2e6b4e] hover:text-[#255a43] transition-colors"
              >
                Home
              </Link>
            )}
            <Link
              to="/browse"
              className="text-sm font-medium text-[#62748e] hover:text-[#2e6b4e] transition-colors"
            >
              Browse
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  to="/favorites"
                  className="text-sm font-medium text-[#62748e] hover:text-[#2e6b4e] transition-colors"
                >
                  Favorites
                </Link>
                <Link
                  to="/my-events"
                  className="text-sm font-medium text-[#62748e] hover:text-[#2e6b4e] transition-colors"
                >
                  My Events
                </Link>
                <Link
                  to="/my-account"
                  className="text-sm font-medium text-[#62748e] hover:text-[#2e6b4e] transition-colors"
                >
                  My Account
                </Link>
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-[#2e6b4e] hover:text-[#255a43] transition-colors"
                  >
                    Admin Control Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#0f172b]">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-[#45556c]">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                {(user.role === "organizer" || user.role === "admin") && (
                  <Link
                    to="/events/new"
                    className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
                  >
                    Create Event
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-[#62748e] hover:text-[#2e6b4e] transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-[#62748e] hover:text-[#2e6b4e] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavBar;
