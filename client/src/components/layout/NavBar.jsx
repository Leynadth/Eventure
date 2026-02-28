import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { logout, getProfile, getNotifications, dismissSignupNotification, markNotificationRead, markNotificationsViewed, clearNotifications } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import RoleBadge from "../ui/RoleBadge";

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const isLoggedIn = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({ organizerSignup: null, messages: [], unreadCount: 0 });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [reasonPopup, setReasonPopup] = useState(null); // { message, reason } for admin unattend

  useEffect(() => {
    if (!isLoggedIn) return;
    getNotifications()
      .then((data) => setNotifications((prev) => ({ ...prev, unreadCount: data.unreadCount ?? 0 })))
      .catch(() => {});
  }, [isLoggedIn]);

  // Refetch unread count when tab regains focus (e.g. after announcement sent in another tab)
  useEffect(() => {
    if (!isLoggedIn) return;
    const onFocus = () => {
      getNotifications()
        .then((data) => setNotifications((prev) => ({ ...prev, unreadCount: data.unreadCount ?? 0 })))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isLoggedIn]);

  // Poll for new notifications so bell turns red when announcements (or other notifs) arrive
  const NOTIFICATION_POLL_MS = 45000;
  useEffect(() => {
    if (!isLoggedIn || notificationsOpen) return;
    const interval = setInterval(() => {
      getNotifications()
        .then((data) => setNotifications((prev) => ({ ...prev, unreadCount: data.unreadCount ?? 0 })))
        .catch(() => {});
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [isLoggedIn, notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen || !isLoggedIn) return;
    setNotificationsLoading(true);
    getNotifications()
      .then((data) => {
        setNotifications({
          organizerSignup: data.organizerSignup ?? null,
          messages: data.messages ?? [],
          unreadCount: 0,
        });
        markNotificationsViewed().catch(() => {});
      })
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, [notificationsOpen, isLoggedIn]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = (e) => {
      if (e.target.closest("[data-notification-bell]") || e.target.closest("[data-notification-dropdown]")) return;
      setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("eventure_token");
      setUser(null);
      setMobileMenuOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path) => {
    const baseClass = "relative px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg";
    if (isActive(path)) {
      return `${baseClass} text-[#2e6b4e] bg-[#2e6b4e]/10`;
    }
    return `${baseClass} text-[#45556c] hover:text-[#2e6b4e] hover:bg-gray-50`;
  };

  const mobileNavLinkClass = (path) => {
    const baseClass = "block px-4 py-3 text-base font-medium transition-colors rounded-lg";
    if (isActive(path)) {
      return `${baseClass} text-[#2e6b4e] bg-[#2e6b4e]/10`;
    }
    return `${baseClass} text-[#45556c] hover:text-[#2e6b4e] hover:bg-gray-50`;
  };

  // Fetch profile to get latest profile picture
  useEffect(() => {
    if (isLoggedIn) {
      const fetchProfile = async () => {
        try {
          const profile = await getProfile();
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
          if (profile?.user?.profilePicture) {
            const pictureUrl = profile.user.profilePicture.startsWith("http")
              ? profile.user.profilePicture
              : `${API_URL}${profile.user.profilePicture}`;
            setProfilePictureUrl(pictureUrl);
          } else {
            setProfilePictureUrl(null);
          }
        } catch (err) {
          console.error("Failed to fetch profile:", err);
          // Fallback to user object from localStorage
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
          if (user?.profilePicture) {
            const pictureUrl = user.profilePicture.startsWith("http")
              ? user.profilePicture
              : `${API_URL}${user.profilePicture}`;
            setProfilePictureUrl(pictureUrl);
          } else {
            setProfilePictureUrl(null);
          }
        }
      };
      fetchProfile();
    } else {
      setProfilePictureUrl(null);
    }
  }, [isLoggedIn]);

  // Generate initials for avatar fallback
  const initials = user 
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "";

  return (
    <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16 gap-4 relative">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center shrink-0 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img 
              src="/eventure-logo.png" 
              alt="Eventure" 
              className="h-12 lg:h-14 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>

          {/* Desktop: center nav links */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            <Link to="/" className={navLinkClass("/")}>Home</Link>
            <Link to="/browse" className={navLinkClass("/browse")}>Browse Events</Link>
            {isLoggedIn && (
              <>
                <Link to="/favorites" className={navLinkClass("/favorites")}>Favorites</Link>
                <Link to="/my-events" className={navLinkClass("/my-events")}>My Events</Link>
              </>
            )}
          </nav>

          {/* Desktop: right side — guest */}
          <div className="hidden lg:flex items-center shrink-0 gap-2">
            {!isLoggedIn && (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 text-sm font-medium text-[#475569] hover:text-[#2e6b4e] hover:bg-[#f8fafc] rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 text-sm font-medium bg-[#2e6b4e] text-white rounded-lg hover:bg-[#255a43] transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}

            {/* Desktop: right side — logged in */}
            {isLoggedIn && (
              <div className="hidden lg:flex items-center gap-3">
                {(user.role === "organizer" || user.role === "admin") && (
                  <Link
                    to="/events/new"
                    className="px-4 py-2.5 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors shadow-sm shrink-0"
                  >
                    + Create Event
                  </Link>
                )}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    data-notification-bell
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-[#64748b] hover:text-[#2e6b4e] hover:bg-[#f8fafc] rounded-lg transition-colors"
                    aria-label="Notifications"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {notifications.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-semibold rounded-full">
                        {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3 pl-3 border-l border-[#e2e8f0]">
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-[#e2e8f0] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#2e6b4e] flex items-center justify-center text-white text-xs font-semibold border border-[#e2e8f0] shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="relative min-w-0 max-w-[140px]">
                    <p className="text-sm font-semibold text-[#0f172b] truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-[#64748b] truncate">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => setSettingsDropdownOpen(true)}
                    onMouseLeave={() => setTimeout(() => setSettingsDropdownOpen(false), 150)}
                  >
                    <button
                      className="p-2 text-[#64748b] hover:text-[#2e6b4e] hover:bg-[#f8fafc] rounded-lg transition-colors"
                      aria-label="Settings"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {settingsDropdownOpen && (
                      <div
                        className="absolute right-0 top-full pt-1.5 w-44 z-50"
                        onMouseEnter={() => setSettingsDropdownOpen(true)}
                        onMouseLeave={() => setSettingsDropdownOpen(false)}
                      >
                        <div className="bg-white rounded-lg shadow-lg border border-[#e2e8f0] py-1.5">
                          <Link to="/my-account" className="block px-4 py-2 text-sm text-[#475569] hover:bg-[#f8fafc] hover:text-[#2e6b4e]" onClick={() => setSettingsDropdownOpen(false)}>My Account</Link>
                          {user.role === "admin" && <Link to="/admin" className="block px-4 py-2 text-sm text-[#475569] hover:bg-[#f8fafc] hover:text-[#2e6b4e]" onClick={() => setSettingsDropdownOpen(false)}>Admin Panel</Link>}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm font-medium text-[#64748b] hover:text-[#2e6b4e] hover:bg-[#f8fafc] rounded-lg transition-colors shrink-0"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications dropdown (shared; fixed on mobile, absolute on desktop) */}
          {notificationsOpen && (
            <div data-notification-dropdown className="fixed right-4 left-4 sm:left-auto sm:w-[340px] top-[3.6rem] lg:absolute lg:right-4 lg:top-full lg:mt-1 lg:w-[340px] max-h-[80vh] overflow-auto bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-2 z-[60]">
              <div className="px-3 py-2 border-b border-[#e2e8f0] flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#0f172b]">Notifications</h3>
                {notifications.messages?.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await clearNotifications();
                        setNotifications((prev) => ({
                          ...prev,
                          messages: [],
                          unreadCount: prev.organizerSignup && prev.organizerSignup.status !== "approved" ? 1 : 0,
                        }));
                      } catch {}
                    }}
                    className="text-xs font-medium text-[#64748b] hover:text-[#2e6b4e]"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {notificationsLoading ? (
                <div className="px-4 py-8 text-center text-[#64748b] text-sm">Loading…</div>
              ) : (
                <div className="py-1">
                  {notifications.organizerSignup && (
                    <div className="flex items-start gap-2 px-4 py-3 hover:bg-[#f8fafc] group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0f172b]">
                          Status of Organizer Registration:{" "}
                          <span className={notifications.organizerSignup.status === "approved" ? "text-green-600" : notifications.organizerSignup.status === "rejected" ? "text-red-600" : "text-amber-600"}>
                            {notifications.organizerSignup.status === "rejected" ? "Denied" : notifications.organizerSignup.status === "approved" ? "Approved" : "Pending"}
                          </span>
                        </p>
                        {notifications.organizerSignup.status === "rejected" && (
                          <p className="text-xs text-[#64748b] mt-0.5">You may reapply in 2 weeks.</p>
                        )}
                      </div>
                      {notifications.organizerSignup.status === "approved" && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              await dismissSignupNotification(notifications.organizerSignup.id);
                              setNotifications((prev) => ({ ...prev, organizerSignup: null, unreadCount: Math.max(0, (prev.unreadCount || 0) - 1) }));
                            } catch {}
                          }}
                          className="shrink-0 p-1 text-[#94a3b8] hover:text-[#0f172b] rounded"
                          aria-label="Dismiss"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                  {notifications.messages.length === 0 && !notifications.organizerSignup && (
                    <p className="px-4 py-6 text-sm text-[#64748b] text-center">No notifications</p>
                  )}
                  {notifications.messages.map((msg) => (
                    msg.reason ? (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => {
                          if (!msg.readAt) markNotificationRead(msg.id).catch(() => {});
                          setReasonPopup({ message: msg.message, reason: msg.reason });
                          setNotificationsOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-3 hover:bg-[#f8fafc] border-b border-[#f1f5f9] last:border-0 ${!msg.readAt ? "bg-[#f0fdf4]/50" : ""}`}
                      >
                        <p className="text-xs text-[#64748b]">{msg.senderName} · {msg.eventTitle}</p>
                        <p className="text-sm text-[#0f172b] mt-0.5 line-clamp-2">{msg.message}</p>
                      </button>
                    ) : (
                      <Link
                        key={msg.id}
                        to={`/events/${msg.eventId}`}
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (!msg.readAt) markNotificationRead(msg.id).catch(() => {});
                        }}
                        className={`block px-4 py-3 hover:bg-[#f8fafc] border-b border-[#f1f5f9] last:border-0 ${!msg.readAt ? "bg-[#f0fdf4]/50" : ""}`}
                      >
                        <p className="text-xs text-[#64748b]">{msg.senderName} · {msg.eventTitle}</p>
                        <p className="text-sm text-[#0f172b] mt-0.5 line-clamp-2">{msg.message}</p>
                      </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason popup (admin unattend) */}
          {reasonPopup && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => setReasonPopup(null)}>
              <div className="bg-white rounded-xl shadow-xl border border-[#e2e8f0] max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-[#64748b] mb-2">{reasonPopup.message}</p>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-1">Reason</p>
                  <p className="text-sm text-[#0f172b] whitespace-pre-wrap">{reasonPopup.reason}</p>
                </div>
                <button type="button" onClick={() => setReasonPopup(null)} className="w-full px-4 py-2 text-sm font-medium text-white bg-[#2e6b4e] rounded-lg hover:bg-[#255a43]">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Mobile: notifications + Create + hamburger */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            {isLoggedIn && (
              <button
                type="button"
                data-notification-bell
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-[#45556c] hover:text-[#2e6b4e] hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full">
                    {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
                  </span>
                )}
              </button>
            )}
            {isLoggedIn && (user.role === "organizer" || user.role === "admin") && (
              <Link
                to="/events/new"
                className="px-3 py-1.5 bg-[#2e6b4e] text-white rounded-lg text-xs font-medium hover:bg-[#255a43] transition-colors"
              >
                + Create
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#45556c] hover:text-[#2e6b4e] hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#e2e8f0] py-4 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              <Link
                to="/"
                className={mobileNavLinkClass("/")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/browse"
                className={mobileNavLinkClass("/browse")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Events
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/favorites"
                    className={mobileNavLinkClass("/favorites")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  <Link
                    to="/my-events"
                    className={mobileNavLinkClass("/my-events")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Events
                  </Link>
                  <div className="px-4 py-3 border-t border-[#e2e8f0] mt-2">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Profile Picture Avatar */}
                      {profilePictureUrl ? (
                        <img
                          src={profilePictureUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#e2e8f0] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#2e6b4e] flex items-center justify-center text-white text-base font-semibold border-2 border-[#e2e8f0] shrink-0">
                          {initials}
                        </div>
                      )}
                      
                      {/* Settings Icon */}
                      <button
                        className="p-1.5 text-[#ef4444] hover:text-[#dc2626] hover:bg-red-50 rounded-full transition-all duration-200"
                        aria-label="Settings"
                        onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                          />
                        </svg>
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0f172b] truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-[#62748e] truncate">{user.email}</p>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    
                    {/* Mobile Settings Dropdown */}
                    {settingsDropdownOpen && (
                      <div className="mb-3 bg-gray-50 rounded-lg py-2">
                        <Link
                          to="/my-account"
                          className="block px-4 py-2 text-sm text-[#45556c] hover:bg-gray-100 hover:text-[#2e6b4e] transition-colors"
                          onClick={() => {
                            setSettingsDropdownOpen(false);
                            setMobileMenuOpen(false);
                          }}
                        >
                          My Account
                        </Link>
                        {user.role === "admin" && (
                          <Link
                            to="/admin"
                            className="block px-4 py-2 text-sm text-[#45556c] hover:bg-gray-100 hover:text-[#2e6b4e] transition-colors"
                            onClick={() => {
                              setSettingsDropdownOpen(false);
                              setMobileMenuOpen(false);
                            }}
                          >
                            Admin Panel
                          </Link>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-[#62748e] hover:text-[#2e6b4e] hover:bg-gray-50 rounded-lg transition-colors font-medium text-left"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-4 pt-3 border-t border-[#e2e8f0] mt-2 flex flex-col gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm text-[#62748e] hover:text-[#2e6b4e] hover:bg-gray-50 rounded-lg transition-colors font-medium text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default NavBar;
