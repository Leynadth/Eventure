import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCurrentUser } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { getAdminStats, getAllEvents, getAdminEventDetails, adminDeleteEvent, getAllUsers, getUserDetails, deleteUser, updateUserRole, unattendUserFromEvent, getAnalytics, getHeroSettings, updateHeroSettings, uploadHeroImage, getContentSettings, updateContentSettings, getImageUrl, getOrganizerSignups, updateOrganizerSignup } from "../../api";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    pendingApprovals: 0,
    popularCategory: { name: "N/A", count: 0 },
    usersThisMonth: 0,
    usersLastMonth: 0,
    eventsThisMonth: 0,
    eventsLastMonth: 0,
    usersPercentChange: null,
    eventsPercentChange: null,
  });
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all"); // "all" | "pending" | "approved" | "declined"
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleUpdatingId, setUserRoleUpdatingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [hero, setHero] = useState({ type: "color", color: "#2e6b4e", image: null });
  const [content, setContent] = useState({
    home_hero_headline: "",
    home_hero_subheadline: "",
    home_most_attended_title: "",
  });
  const [customizeLoading, setCustomizeLoading] = useState(false);
  const [customizeSaving, setCustomizeSaving] = useState(false);
  const [heroSaveStatus, setHeroSaveStatus] = useState(null); // 'success' | 'error' | null
  const [heroSaveMessage, setHeroSaveMessage] = useState("");
  const hasLoadedRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [eventDetailsLoading, setEventDetailsLoading] = useState(false);
  const [organizerSignups, setOrganizerSignups] = useState([]);
  const [organizerSignupsLoading, setOrganizerSignupsLoading] = useState(false);
  const [organizerSignupActionId, setOrganizerSignupActionId] = useState(null);
  const [unattendModal, setUnattendModal] = useState({ open: false, eventId: null, eventTitle: null });
  const [unattendReason, setUnattendReason] = useState("");
  const [unattendSubmitting, setUnattendSubmitting] = useState(false);

  const user = useCurrentUser();
  const { toast, confirm } = useNotification();

  // Memoize loadData to prevent recreation on every render
  const loadData = useCallback(async () => {
    try {
      setEventsLoading(true);
      console.log("Loading admin data...");
      
      // Load stats first, then events separately to see which one fails
      try {
        const statsData = await getAdminStats();
        console.log("Stats data:", statsData);
        const raw = statsData || {
          totalUsers: 0,
          totalEvents: 0,
          pendingApprovals: 0,
          popularCategory: { name: "N/A", count: 0 },
        };
        const usersLast = Number(raw.usersLastMonth) || 0;
        const usersThis = Number(raw.usersThisMonth) || 0;
        const eventsLast = Number(raw.eventsLastMonth) || 0;
        const eventsThis = Number(raw.eventsThisMonth) || 0;
        setStats({
          ...raw,
          totalUsers: Number(raw.totalUsers) || 0,
          totalEvents: Number(raw.totalEvents) || 0,
          pendingApprovals: Number(raw.pendingApprovals) || 0,
          popularCategory: raw.popularCategory || { name: "N/A", count: 0 },
          usersThisMonth: usersThis,
          usersLastMonth: usersLast,
          eventsThisMonth: eventsThis,
          eventsLastMonth: eventsLast,
          usersPercentChange: usersLast > 0 ? Math.round(((usersThis - usersLast) / usersLast) * 100) : null,
          eventsPercentChange: eventsLast > 0 ? Math.round(((eventsThis - eventsLast) / eventsLast) * 100) : null,
        });
      } catch (statsErr) {
        console.error("Failed to load stats:", statsErr);
        setStats({
          totalUsers: 0,
          totalEvents: 0,
          pendingApprovals: 0,
          popularCategory: { name: "N/A", count: 0 },
          usersThisMonth: 0,
          usersLastMonth: 0,
          eventsThisMonth: 0,
          eventsLastMonth: 0,
          usersPercentChange: null,
          eventsPercentChange: null,
        });
      }
      
      try {
        const eventsData = await getAllEvents();
        console.log("Events data:", eventsData);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (eventsErr) {
        console.error("Failed to load events:", eventsErr);
        toast(`Failed to load events: ${eventsErr.message || "Unknown error"}`, "error");
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      console.error("Error details:", err.message, err.stack);
      // Don't show alert here since we're handling errors individually above
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Check authentication and authorization only once
  useEffect(() => {
    try {
      // Check if user is admin
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      if (user.role !== "admin") {
        navigate("/", { replace: true });
        return;
      }

      setLoading(false);
      
      // Load data only once after auth check passes
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadData();
      }
    } catch (err) {
      console.error("AdminDashboardPage error:", err);
      setError(err.message);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadData]);

  const handleDelete = async (eventId) => {
    const ok = await confirm({ title: "Delete event", message: "Are you sure you want to delete this event? This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", variant: "danger" });
    if (!ok) return;
    try {
      await adminDeleteEvent(eventId);
      toast("Event deleted successfully!", "success");
      await loadData();
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast(err.message || "Failed to delete event", "error");
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const usersData = await getAllUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast(`Failed to load users: ${err.message || "Unknown error"}`, "error");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadOrganizerSignups = useCallback(async () => {
    try {
      setOrganizerSignupsLoading(true);
      const data = await getOrganizerSignups();
      setOrganizerSignups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load organizer signups:", err);
      setOrganizerSignups([]);
    } finally {
      setOrganizerSignupsLoading(false);
    }
  }, []);

  const handleUserClick = async (userId) => {
    try {
      setUserDetailsLoading(true);
      const details = await getUserDetails(userId);
      setUserDetails(details);
      setSelectedUser(userId);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Failed to load user details:", err);
      toast(err.message || "Failed to load user details", "error");
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !userDetails) return;
    
    if (userDetails.user.role === "admin") {
      toast("Cannot delete admin users", "error");
      return;
    }

    if (deleteConfirmText.toLowerCase() !== "confirm") {
      toast('Please type "confirm" to delete this user', "error");
      return;
    }

    const ok = await confirm({
      title: "Delete user",
      message: `Are you absolutely sure you want to delete ${userDetails.user.firstName} ${userDetails.user.lastName}? This will permanently delete their account and all associated events. This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      setIsDeleting(true);
      await deleteUser(selectedUser);
      toast("User deleted successfully!", "success");
      setSelectedUser(null);
      setUserDetails(null);
      setDeleteConfirmText("");
      await loadUsers();
      await loadData(); // Reload stats
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast(err.message || "Failed to delete user", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openUnattendModal = (eventId, eventTitle) => {
    setUnattendModal({ open: true, eventId, eventTitle });
    setUnattendReason("");
  };

  const closeUnattendModal = () => {
    setUnattendModal({ open: false, eventId: null, eventTitle: null });
    setUnattendReason("");
  };

  const handleUnattendUser = async () => {
    if (!selectedUser || !unattendModal.eventId) return;
    const reason = unattendReason.trim();
    if (!reason) {
      toast("Please provide a reason for unattending this user.", "error");
      return;
    }
    setUnattendSubmitting(true);
    try {
      await unattendUserFromEvent(selectedUser, unattendModal.eventId, reason);
      toast("User unattended successfully!", "success");
      closeUnattendModal();
      await handleUserClick(selectedUser);
    } catch (err) {
      console.error("Failed to unattend user:", err);
      toast(err.message || "Failed to unattend user", "error");
    } finally {
      setUnattendSubmitting(false);
    }
  };

  const handleDeleteEventFromUser = async (eventId) => {
    const ok = await confirm({ title: "Delete event", message: "Are you sure you want to delete this event? This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", variant: "danger" });
    if (!ok) return;
    try {
      await adminDeleteEvent(eventId);
      toast("Event deleted successfully!", "success");
      if (selectedUser) await handleUserClick(selectedUser);
      await loadData();
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast(err.message || "Failed to delete event", "error");
    }
  };

  // Load users when users tab is opened (fresh list each time)
  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
    if (activeTab === "organizer-signups") {
      loadOrganizerSignups();
    }
  }, [activeTab, loadUsers, loadOrganizerSignups]);

  // Load analytics when analytics tab is active
  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const analyticsData = await getAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast(`Failed to load analytics: ${err.message || "Unknown error"}`, "error");
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "analytics" && analytics === null && !analyticsLoading) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadCustomizeData = useCallback(async () => {
    try {
      setCustomizeLoading(true);
      setHeroSaveStatus(null);
      setHeroSaveMessage("");
      const [heroData, contentData] = await Promise.all([
        getHeroSettings(),
        getContentSettings(),
      ]);
      setHero(heroData || { type: "color", color: "#2e6b4e", image: null });
      setContent(contentData || {
        home_hero_headline: "",
        home_hero_subheadline: "",
        home_most_attended_title: "",
      });
    } catch (err) {
      console.error("Failed to load customize data:", err);
      toast("Failed to load site settings", "error");
    } finally {
      setCustomizeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "customize" && !customizeLoading) {
      loadCustomizeData();
    }
  }, [activeTab, loadCustomizeData]);

  const handleHeroTypeChange = (type) => {
    setHero((prev) => ({ ...prev, type }));
  };

  const handleHeroColorChange = (e) => {
    setHero((prev) => ({ ...prev, color: e.target.value }));
  };

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroSaveStatus(null);
    setHeroSaveMessage("");
    try {
      setCustomizeSaving(true);
      const res = await uploadHeroImage(file);
      const imagePath = res?.url || res?.image || res?.path;
      if (!imagePath) throw new Error("No image URL returned from server");
      setHero((prev) => ({ ...prev, type: "image", image: imagePath }));
      await updateHeroSettings({ type: "image", color: hero.color || "#2e6b4e", image: imagePath });
      setHeroSaveStatus("success");
      setHeroSaveMessage("Hero image uploaded and saved.");
      setTimeout(() => { setHeroSaveStatus(null); setHeroSaveMessage(""); }, 4000);
    } catch (err) {
      const msg = err?.message || "Failed to upload or save hero image";
      setHeroSaveStatus("error");
      setHeroSaveMessage(msg);
      console.error("Hero image upload/save error:", err);
    } finally {
      setCustomizeSaving(false);
    }
  };

  const handleSaveHero = async (e) => {
    if (e) e.preventDefault();
    setHeroSaveStatus(null);
    setHeroSaveMessage("");
    try {
      setCustomizeSaving(true);
      await updateHeroSettings({ type: hero.type, color: hero.color || "#2e6b4e", image: hero.image || null });
      setHeroSaveStatus("success");
      setHeroSaveMessage("Hero settings saved.");
      setTimeout(() => { setHeroSaveStatus(null); setHeroSaveMessage(""); }, 4000);
    } catch (err) {
      const msg = err?.message || "Failed to save hero settings";
      setHeroSaveStatus("error");
      setHeroSaveMessage(msg);
      console.error("Save hero error:", err);
    } finally {
      setCustomizeSaving(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setCustomizeSaving(true);
      await updateContentSettings(content);
      toast("Content saved!", "success");
    } catch (err) {
      toast(err.message || "Failed to save content", "error");
    } finally {
      setCustomizeSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const openEventDetail = async (eventId) => {
    setSelectedEventId(eventId);
    setEventDetails(null);
    setEventDetailsLoading(true);
    try {
      const data = await getAdminEventDetails(eventId);
      setEventDetails(data);
    } catch (err) {
      console.error("Failed to load event details:", err);
      toast(err.message || "Failed to load event details", "error");
      setSelectedEventId(null);
    } finally {
      setEventDetailsLoading(false);
    }
  };

  const closeEventDetail = () => {
    setSelectedEventId(null);
    setEventDetails(null);
  };

  const handleDeleteEventAndClose = async (eventId) => {
    const ok = await confirm({ title: "Delete event", message: "Are you sure you want to delete this event? This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", variant: "danger" });
    if (!ok) return;
    try {
      await adminDeleteEvent(eventId);
      toast("Event deleted successfully!", "success");
      closeEventDetail();
      await loadData();
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast(err.message || "Failed to delete event", "error");
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Campus: "bg-green-100 text-green-800",
      Tech: "bg-green-100 text-green-800",
      Concerts: "bg-green-100 text-green-800",
      Charity: "bg-green-100 text-green-800",
      Sports: "bg-green-100 text-green-800",
      Fairs: "bg-orange-100 text-orange-800",
      Music: "bg-green-100 text-green-800",
      Food: "bg-green-100 text-green-800",
      Arts: "bg-green-100 text-green-800",
      Business: "bg-green-100 text-green-800",
      Networking: "bg-green-100 text-green-800",
      Workshop: "bg-green-100 text-green-800",
      Conference: "bg-green-100 text-green-800",
      Festival: "bg-green-100 text-green-800",
      Other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-orange-100 text-orange-800";
    if (status === "declined") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2e6b4e] border-t-transparent mx-auto mb-4" />
          <p className="text-[#64748b] font-medium">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg hover:bg-[#255a43] transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#f8fafc] min-h-0">
      {/* Mobile: menu button + title bar */}
      <div className="lg:hidden flex items-center justify-between gap-4 p-4 bg-white border-b border-[#e2e8f0] shrink-0">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-lg text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e] transition-colors"
          aria-label="Toggle admin menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#0f172b] truncate">Admin Dashboard</h1>
          <p className="text-xs text-[#64748b] truncate">Manage events, users, analytics</p>
        </div>
        <Link
          to="/"
          className="p-2 rounded-lg text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e] transition-colors shrink-0"
          aria-label="Back to site"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
      </div>

      {/* Mobile overlay when sidebar open */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          aria-label="Close menu"
        />
      )}

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <div
        className={`
          w-64 bg-white border-r border-[#e2e8f0] flex flex-col shrink-0 shadow-sm
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ top: 0 }}
      >
        {/* Sidebar Header */}
        <div className="p-4 lg:p-6 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172b]">Admin</h2>
            <p className="text-xs text-[#64748b] mt-0.5">Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-[#475569] hover:bg-[#f1f5f9]"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-auto">
          <div className="space-y-1">
            <button
              onClick={() => { setActiveTab("events"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "events"
                  ? "bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Events
            </button>
            <button
              onClick={() => { setActiveTab("users"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "users"
                  ? "bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Users
            </button>
            <button
              onClick={() => { setActiveTab("organizer-signups"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "organizer-signups"
                  ? "bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
              Organizer Signups
              {organizerSignups.filter((s) => s.status === "pending").length > 0 && (
                <span className="ml-auto bg-[#2e6b4e] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {organizerSignups.filter((s) => s.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "analytics"
                  ? "bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Analytics
            </button>
            <button
              onClick={() => { setActiveTab("customize"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "customize"
                  ? "bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Customize
            </button>
          </div>
        </nav>

        {/* Back to Site */}
        <div className="p-4 border-t border-[#e2e8f0]">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#475569] hover:bg-[#f1f5f9] hover:text-[#2e6b4e] transition-colors text-sm font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Back to Site
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#f8fafc] min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Page title - hidden on mobile (shown in top bar) */}
          <div className="hidden lg:block mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172b] mb-1">Admin Dashboard</h1>
            <p className="text-[#64748b] text-sm sm:text-base">Manage events, users, and platform analytics</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.totalUsers}</p>
              <p className={`text-sm flex items-center gap-1 ${(stats.usersPercentChange ?? 0) > 0 ? "text-green-600" : (stats.usersPercentChange ?? 0) < 0 ? "text-red-600" : "text-gray-500"}`}>
                {stats.usersPercentChange != null ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={stats.usersPercentChange < 0 ? "rotate-180" : ""}
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    {stats.usersPercentChange > 0 ? "+" : ""}{stats.usersPercentChange}% vs last month
                  </>
                ) : stats.usersLastMonth === 0 && stats.usersThisMonth > 0 ? (
                  "New this month"
                ) : (
                  "— vs last month"
                )}
              </p>
            </div>

            {/* Total Events */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Events</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.totalEvents}</p>
              <p className={`text-sm flex items-center gap-1 ${(stats.eventsPercentChange ?? 0) > 0 ? "text-green-600" : (stats.eventsPercentChange ?? 0) < 0 ? "text-red-600" : "text-gray-500"}`}>
                {stats.eventsPercentChange != null ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={stats.eventsPercentChange < 0 ? "rotate-180" : ""}
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    {stats.eventsPercentChange > 0 ? "+" : ""}{stats.eventsPercentChange}% vs last month
                  </>
                ) : stats.eventsLastMonth === 0 && stats.eventsThisMonth > 0 ? (
                  "New this month"
                ) : (
                  "— vs last month"
                )}
              </p>
            </div>

            {/* Popular Category */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Popular Category</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.popularCategory.name}</p>
              <p className="text-sm text-gray-600">{stats.popularCategory.count} events</p>
            </div>
          </div>

          {/* Event Management Section */}
          {activeTab === "events" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Event Management</h2>
                    <p className="text-sm text-gray-600">Review and manage all platform events</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { loadData(); }}
                    disabled={eventsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    Refresh
                  </button>
                </div>
                {/* Status filter */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {["all", "pending", "approved", "declined"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEventStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        eventStatusFilter === status
                          ? "bg-[#2e6b4e] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Search Bar */}
                <div className="mt-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search events by title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {eventsLoading ? (
                  <div className="p-8 text-center text-gray-600">Loading events...</div>
                ) : (() => {
                  // Filter by search then by status
                  let filteredEvents = searchQuery.trim()
                    ? events.filter((event) =>
                        event.title?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : events;
                  if (eventStatusFilter !== "all") {
                    filteredEvents = filteredEvents.filter((e) => e.status === eventStatusFilter);
                  }
                  
                  return filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-gray-600">
                      {searchQuery
                        ? `No events found matching "${searchQuery}"`
                        : eventStatusFilter !== "all"
                        ? `No ${eventStatusFilter} events`
                        : "No events found"}
                    </div>
                  ) : (
                    <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organizer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openEventDetail(event.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{event.title}</div>
                            <div className="text-sm text-gray-500">
                              {event.rsvp_count || 0} attending
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{event.organizer_name || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(
                                event.category
                              )}`}
                            >
                              {event.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(event.starts_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                event.status
                              )}`}
                            >
                              {event.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="text-gray-600 hover:text-red-600"
                                title="Delete"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Users Section */}
          {activeTab === "users" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">User Management</h2>
                    <p className="text-sm text-gray-600">View and manage platform users</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadUsers()}
                    disabled={usersLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    Refresh
                  </button>
                </div>
                {/* Search Bar */}
                <div className="mt-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users by email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {usersLoading ? (
                  <div className="p-8 text-center text-gray-600">Loading users...</div>
                ) : (() => {
                  const filteredUsers = userSearchQuery.trim()
                    ? users.filter((user) =>
                        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                      )
                    : users;
                  
                  return filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-600">
                      {userSearchQuery ? `No users found matching "${userSearchQuery}"` : "No users found"}
                    </div>
                  ) : (
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr 
                            key={user.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleUserClick(user.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : user.role === "organizer"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(user.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Organizer Signups Section */}
          {activeTab === "organizer-signups" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Organizer Signups</h2>
                    <p className="text-sm text-gray-600">Review applications from users who want to host events</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadOrganizerSignups()}
                    disabled={organizerSignupsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {organizerSignupsLoading ? (
                  <div className="p-8 text-center text-gray-600">Loading signups...</div>
                ) : organizerSignups.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">No organizer signups yet</div>
                ) : (
                  organizerSignups.map((signup) => (
                    <div key={signup.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">
                              {signup.user?.firstName} {signup.user?.lastName}
                            </span>
                            <span className="text-sm text-gray-500">({signup.user?.email})</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              signup.status === "pending" ? "bg-amber-100 text-amber-800" :
                              signup.status === "approved" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {signup.status}
                            </span>
                          </div>
                          {signup.organizationName && (
                            <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Organization:</span> {signup.organizationName}</p>
                          )}
                          {signup.eventTypes && (
                            <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Event types:</span> {signup.eventTypes}</p>
                          )}
                          <p className="text-sm text-gray-700 mt-2"><span className="font-medium text-gray-700">Reason:</span> {signup.reason}</p>
                          {signup.additionalInfo && (
                            <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-gray-700">Additional info:</span> {signup.additionalInfo}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">Applied {formatDate(signup.createdAt)}</p>
                        </div>
                        {signup.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                const approved = await confirm({ title: "Approve organizer", message: "Approve this user as an organizer? They will be able to create events.", confirmLabel: "Approve", cancelLabel: "Cancel" });
                                if (!approved) return;
                                setOrganizerSignupActionId(signup.id);
                                try {
                                  await updateOrganizerSignup(signup.id, "approve");
                                  await loadOrganizerSignups();
                                } catch (e) {
                                  toast(e.message || "Failed to approve", "error");
                                } finally {
                                  setOrganizerSignupActionId(null);
                                }
                              }}
                              disabled={organizerSignupActionId !== null}
                              className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] disabled:opacity-50"
                            >
                              {organizerSignupActionId === signup.id ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const rejected = await confirm({ title: "Reject application", message: "Reject this organizer application?", confirmLabel: "Reject", cancelLabel: "Cancel", variant: "danger" });
                                if (!rejected) return;
                                setOrganizerSignupActionId(signup.id);
                                try {
                                  await updateOrganizerSignup(signup.id, "reject");
                                  await loadOrganizerSignups();
                                } catch (e) {
                                  toast(e.message || "Failed to reject", "error");
                                } finally {
                                  setOrganizerSignupActionId(null);
                                }
                              }}
                              disabled={organizerSignupActionId !== null}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                              {organizerSignupActionId === signup.id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Analytics Section */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => loadAnalytics()}
                  disabled={analyticsLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                  Refresh analytics
                </button>
              </div>
              {analyticsLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <>
                  {/* This month (resets each month) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      This month {analytics.currentMonthLabel || new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Counts for the current month; resets at the start of each month.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">New users</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.thisMonth?.users ?? 0}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">Events created</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.thisMonth?.events ?? 0}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">RSVPs (going)</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.thisMonth?.rsvps ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                      <h3 className="text-sm font-medium text-blue-100 mb-2">Engagement Rate</h3>
                      <p className="text-3xl font-bold mb-1">
                        {analytics.totals.totalEvents > 0 
                          ? Math.round((analytics.totals.totalRsvps / analytics.totals.totalEvents) * 10) / 10
                          : 0}
                      </p>
                      <p className="text-sm text-blue-100">RSVPs per event</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                      <h3 className="text-sm font-medium text-green-100 mb-2">Approval Rate</h3>
                      <p className="text-3xl font-bold mb-1">
                        {analytics.totals.totalEvents > 0
                          ? Math.round((analytics.totals.approvedEvents / analytics.totals.totalEvents) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-green-100">Events approved</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                      <h3 className="text-sm font-medium text-purple-100 mb-2">User Activity</h3>
                      <p className="text-3xl font-bold mb-1">
                        {analytics.totals.totalUsers > 0
                          ? Math.round((analytics.totals.totalEvents / analytics.totals.totalUsers) * 10) / 10
                          : 0}
                      </p>
                      <p className="text-sm text-purple-100">Events per user</p>
                    </div>
                  </div>

                  {/* Growth Trends */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Growth Trends</h3>
                        <p className="text-sm text-gray-600 mt-1">Last 12 months ending with current month</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Events Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Events Created</h4>
                        {analytics.eventsOverTime.length > 0 ? (
                          <div className="flex items-end gap-1.5 h-48">
                            {analytics.eventsOverTime.map((item, index) => {
                              const maxCount = Math.max(...analytics.eventsOverTime.map(e => parseInt(e.count)), 1);
                              const height = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
                              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' });
                              return (
                                <div key={index} className="flex-1 flex flex-col items-center group">
                                  <div className="w-full flex flex-col items-center justify-end h-full relative">
                                    <div
                                      className="w-full bg-gradient-to-t from-[#2e6b4e] to-[#3a8a6a] rounded-t hover:from-[#255a43] hover:to-[#2e6b4e] transition-all cursor-pointer shadow-sm"
                                      style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '0' }}
                                      title={`${monthLabel}: ${item.count} events`}
                                    >
                                      <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow-md z-10">
                                        {item.count}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
                                    {monthLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-8">No data</p>
                        )}
                      </div>

                      {/* Users Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">New Users</h4>
                        {analytics.usersOverTime.length > 0 ? (
                          <div className="flex items-end gap-1.5 h-48">
                            {analytics.usersOverTime.map((item, index) => {
                              const maxCount = Math.max(...analytics.usersOverTime.map(u => parseInt(u.count)), 1);
                              const height = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
                              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' });
                              return (
                                <div key={index} className="flex-1 flex flex-col items-center group">
                                  <div className="w-full flex flex-col items-center justify-end h-full relative">
                                    <div
                                      className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t hover:from-blue-600 hover:to-blue-700 transition-all cursor-pointer shadow-sm"
                                      style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '0' }}
                                      title={`${monthLabel}: ${item.count} users`}
                                    >
                                      <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow-md z-10">
                                        {item.count}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
                                    {monthLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-8">No data</p>
                        )}
                      </div>

                      {/* RSVPs Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">RSVPs</h4>
                        {analytics.rsvpsOverTime.length > 0 ? (
                          <div className="flex items-end gap-1.5 h-48">
                            {analytics.rsvpsOverTime.map((item, index) => {
                              const maxCount = Math.max(...analytics.rsvpsOverTime.map(r => parseInt(r.count)), 1);
                              const height = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
                              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' });
                              return (
                                <div key={index} className="flex-1 flex flex-col items-center group">
                                  <div className="w-full flex flex-col items-center justify-end h-full relative">
                                    <div
                                      className="w-full bg-gradient-to-t from-purple-500 to-purple-600 rounded-t hover:from-purple-600 hover:to-purple-700 transition-all cursor-pointer shadow-sm"
                                      style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '0' }}
                                      title={`${monthLabel}: ${item.count} RSVPs`}
                                    >
                                      <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow-md z-10">
                                        {item.count}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
                                    {monthLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-8">No data</p>
                        )}
                      </div>
                    </div>
                  </div>


                  {/* Distribution Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Events by Category */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Category Distribution</h3>
                      <p className="text-sm text-gray-600 mb-4">Most popular event categories</p>
                      {analytics.eventsByCategory.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.eventsByCategory.slice(0, 8).map((item, index) => {
                            const maxCount = Math.max(...analytics.eventsByCategory.map(e => parseInt(e.count)), 1);
                            const width = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
                            const percentage = analytics.totals.approvedEvents > 0 
                              ? Math.round((parseInt(item.count) / analytics.totals.approvedEvents) * 100)
                              : 0;
                            return (
                              <div key={index} className="flex items-center gap-3">
                                <div className="w-28 text-sm font-medium text-gray-700 truncate">{item.category}</div>
                                <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-[#2e6b4e] to-[#3a8a6a] h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 shadow-sm"
                                    style={{ width: `${width}%` }}
                                  >
                                    {width > 20 && (
                                      <span className="text-xs text-white font-semibold">{item.count}</span>
                                    )}
                                  </div>
                                  {width <= 20 && (
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 font-semibold">
                                      {item.count}
                                    </span>
                                  )}
                                </div>
                                <div className="w-12 text-right text-xs font-semibold text-gray-600">{percentage}%</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-8">No data available</p>
                      )}
                    </div>

                    {/* Events by Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Status Overview</h3>
                      <p className="text-sm text-gray-600 mb-4">Event approval pipeline</p>
                      {analytics.eventsByStatus.length > 0 ? (
                        <div className="space-y-4">
                          {analytics.eventsByStatus.map((item, index) => {
                            const percentage = analytics.totals.totalEvents > 0
                              ? Math.round((parseInt(item.count) / analytics.totals.totalEvents) * 100)
                              : 0;
                            return (
                              <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                      {item.status.toUpperCase()}
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                                  </div>
                                  <span className="text-lg font-semibold text-gray-600">{percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                      item.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                      item.status === 'pending' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                      'bg-gradient-to-r from-red-500 to-red-600'
                                    }`}
                                    style={{
                                      width: `${percentage}%`
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-8">No data available</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-600">Failed to load analytics data</p>
                </div>
              )}
            </div>
          )}

          {/* Customize Section */}
          {activeTab === "customize" && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Customize site</h2>
                  <p className="text-gray-500 mt-1">Hero, colors, and home page content.</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadCustomizeData()}
                  disabled={customizeLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                  Refresh settings
                </button>
              </div>

              {customizeLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2e6b4e] border-t-transparent mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading settings…</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Hero Section Card */}
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2e6b4e]/10 text-[#2e6b4e]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Hero section</h3>
                          <p className="text-sm text-gray-500">Background and banner at the top of the home page.</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* Live preview strip */}
                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner" style={{ height: "80px" }}>
                        {hero.type === "image" && hero.image ? (
                          <img
                            src={getImageUrl(hero.image)}
                            alt="Hero preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: hero.color || "#2e6b4e" }}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">Background type</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="heroType"
                              checked={hero.type === "color"}
                              onChange={() => handleHeroTypeChange("color")}
                              className="w-4 h-4 text-[#2e6b4e] border-gray-300 focus:ring-[#2e6b4e]"
                            />
                            <span className="text-gray-700 font-medium group-hover:text-gray-900">Solid color</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="heroType"
                              checked={hero.type === "image"}
                              onChange={() => handleHeroTypeChange("image")}
                              className="w-4 h-4 text-[#2e6b4e] border-gray-300 focus:ring-[#2e6b4e]"
                            />
                            <span className="text-gray-700 font-medium group-hover:text-gray-900">Image</span>
                          </label>
                        </div>
                      </div>

                      {hero.type === "color" && (
                        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <label className="block text-sm font-medium text-gray-700">Color</label>
                          <input
                            type="color"
                            value={hero.color || "#2e6b4e"}
                            onChange={handleHeroColorChange}
                            className="w-14 h-14 rounded-xl border-2 border-gray-200 cursor-pointer shadow-sm"
                          />
                          <input
                            type="text"
                            value={hero.color || "#2e6b4e"}
                            onChange={(e) => setHero((prev) => ({ ...prev, color: e.target.value || "#2e6b4e" }))}
                            className="px-4 py-2.5 border border-gray-300 rounded-xl w-28 font-mono text-sm focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                          />
                        </div>
                      )}

                      {hero.type === "image" && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">Hero image</label>
                          {hero.image && (
                            <img
                              src={getImageUrl(hero.image)}
                              alt="Hero preview"
                              className="max-h-44 w-full rounded-xl border border-gray-200 object-cover shadow-sm"
                            />
                          )}
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-gray-500">Choose an image (upload saves automatically)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleHeroImageUpload}
                              disabled={customizeSaving}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#2e6b4e] file:text-white file:cursor-pointer hover:file:bg-[#255a43] transition-colors"
                            />
                          </label>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveHero}
                          disabled={customizeSaving}
                          className="px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {customizeSaving ? "Saving…" : "Save hero"}
                        </button>
                        {heroSaveStatus === "success" && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium" role="status">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                            {heroSaveMessage}
                          </span>
                        )}
                        {heroSaveStatus === "error" && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium" role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                            {heroSaveMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Editable Content Card */}
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2e6b4e]/10 text-[#2e6b4e]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Editable content</h3>
                          <p className="text-sm text-gray-500">Headlines and text blocks on the home page.</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero headline</label>
                        <input
                          type="text"
                          value={content.home_hero_headline || ""}
                          onChange={(e) => setContent((prev) => ({ ...prev, home_hero_headline: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                          placeholder="Find your next event"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero subheadline</label>
                        <input
                          type="text"
                          value={content.home_hero_subheadline || ""}
                          onChange={(e) => setContent((prev) => ({ ...prev, home_hero_subheadline: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                          placeholder="Discover events near you"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Most attended title</label>
                        <input
                          type="text"
                          value={content.home_most_attended_title || ""}
                          onChange={(e) => setContent((prev) => ({ ...prev, home_most_attended_title: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                          placeholder="Most Attended Event"
                        />
                      </div>
                      <button
                        onClick={handleSaveContent}
                        disabled={customizeSaving}
                        className="px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {customizeSaving ? "Saving…" : "Save content"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Placeholder for other tabs */}
          {activeTab !== "events" && activeTab !== "users" && activeTab !== "analytics" && activeTab !== "customize" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserDetails(null);
                  setDeleteConfirmText("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {userDetailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading user details...</p>
                </div>
              ) : userDetails ? (
                <>
                  {/* User Info */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="text-base font-medium text-gray-900">
                          {userDetails.user.firstName} {userDetails.user.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="text-base font-medium text-gray-900">{userDetails.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Role</p>
                        {userDetails.user.role === "admin" ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            admin
                          </span>
                        ) : (
                          <select
                            value={userDetails.user.role}
                            disabled={userRoleUpdatingId === selectedUser}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              if (newRole === userDetails.user.role) return;
                              setUserRoleUpdatingId(selectedUser);
                              try {
                                await updateUserRole(selectedUser, newRole);
                                setUserDetails((prev) =>
                                  prev ? { ...prev, user: { ...prev.user, role: newRole } } : null
                                );
                                setUsers((prev) =>
                                  prev.map((u) => (u.id === selectedUser ? { ...u, role: newRole } : u))
                                );
                              } catch (err) {
                                toast(err.message || "Failed to update role", "error");
                              } finally {
                                setUserRoleUpdatingId(null);
                              }
                            }}
                            className="mt-0.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent disabled:opacity-50 cursor-pointer"
                          >
                            <option value="user">user</option>
                            <option value="organizer">organizer</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Joined</p>
                        <p className="text-base font-medium text-gray-900">
                          {formatDate(userDetails.user.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Events */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Pending Event Listings ({userDetails.pendingEvents?.length || 0})
                    </h3>
                    {!userDetails.pendingEvents || userDetails.pendingEvents.length === 0 ? (
                      <p className="text-gray-600 text-sm">No pending events</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.pendingEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <p className="text-sm text-gray-600">
                                  {event.category} • {formatDate(event.starts_at)} • {event.rsvp_count || 0} attending
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                                  {event.status}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEventFromUser(event.id);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete event"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Created Events */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Active Event Listings ({userDetails.createdEvents.length})
                    </h3>
                    {userDetails.createdEvents.length === 0 ? (
                      <p className="text-gray-600 text-sm">No active events created</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.createdEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <p className="text-sm text-gray-600">
                                  {event.category} • {formatDate(event.starts_at)} • {event.rsvp_count || 0} attending
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                                  {event.status}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEventFromUser(event.id);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete event"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attending Events */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Events Attending ({userDetails.attendingEvents.length})
                    </h3>
                    {userDetails.attendingEvents.length === 0 ? (
                      <p className="text-gray-600 text-sm">Not attending any events</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.attendingEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <p className="text-sm text-gray-600">
                                  {event.category} • {formatDate(event.starts_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                                  {event.status}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openUnattendModal(event.id, event.title);
                                  }}
                                  className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Unattend user from event"
                                >
                                  Unattend
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete User Section */}
                  {userDetails.user.role !== "admin" && (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 mb-4">
                          Deleting this user will permanently remove their account and all associated events. This action cannot be undone.
                        </p>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type "confirm" to delete this user:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type 'confirm' to delete"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={handleDeleteUser}
                          disabled={isDeleting || deleteConfirmText.toLowerCase() !== "confirm"}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? "Deleting..." : "Delete User"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal (Admin) */}
      {selectedEventId != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEventDetail} role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
              <h2 id="event-detail-title" className="text-xl font-bold text-[#0f172b]">Event details</h2>
              <button type="button" onClick={closeEventDetail} className="p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172b]" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
              {eventDetailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2e6b4e] border-t-transparent" />
                </div>
              ) : eventDetails?.event ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172b] mb-1">{eventDetails.event.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(eventDetails.event.category)}`}>
                        {eventDetails.event.category}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(eventDetails.event.status)}`}>
                        {eventDetails.event.status}
                      </span>
                      {eventDetails.event.ticket_price != null && Number(eventDetails.event.ticket_price) > 0 ? (
                        <span className="text-sm text-[#475569]">${Number(eventDetails.event.ticket_price).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Free</span>
                      )}
                    </div>
                  </div>

                  {eventDetails.event.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">Description</h4>
                      <p className="text-[#475569] text-sm whitespace-pre-wrap">{eventDetails.event.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">When posted</h4>
                      <p className="text-[#0f172b] font-medium">{formatDateTime(eventDetails.event.created_at)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">Status</h4>
                      <p className="text-[#0f172b] font-medium capitalize">{eventDetails.event.status}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">Event date & time</h4>
                      <p className="text-[#0f172b] font-medium">{formatDateTime(eventDetails.event.starts_at)}</p>
                    {eventDetails.event.ends_at && <p className="text-[#64748b] text-sm">to {formatDateTime(eventDetails.event.ends_at)}</p>}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">Organizer</h4>
                    <p className="text-[#0f172b] font-medium">{eventDetails.event.organizer_name || "—"}</p>
                    {eventDetails.event.organizer_email && <p className="text-[#64748b] text-sm">{eventDetails.event.organizer_email}</p>}
                  </div>

                  {(eventDetails.event.venue || eventDetails.event.address_line1 || eventDetails.event.city) && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-1">Location</h4>
                      <p className="text-[#0f172b] text-sm">
                        {[eventDetails.event.venue, eventDetails.event.address_line1, [eventDetails.event.city, eventDetails.event.state].filter(Boolean).join(", "), eventDetails.event.zip_code].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">Attendees ({eventDetails.attendees?.length ?? 0})</h4>
                    {eventDetails.attendees?.length > 0 ? (
                      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-[#f8fafc] sticky top-0">
                              <tr>
                                <th className="px-3 py-2 font-medium text-[#64748b]">Name</th>
                                <th className="px-3 py-2 font-medium text-[#64748b]">Email</th>
                                <th className="px-3 py-2 font-medium text-[#64748b]">Signed up</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e2e8f0]">
                              {eventDetails.attendees.map((a) => (
                                <tr key={a.rsvp_id}>
                                  <td className="px-3 py-2 font-medium text-[#0f172b]">{[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}</td>
                                  <td className="px-3 py-2 text-[#475569]">{a.email || "—"}</td>
                                  <td className="px-3 py-2 text-[#64748b]">{formatDateTime(a.signed_up_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#64748b] text-sm py-2">No attendees yet.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#e2e8f0]">
                    <button type="button" onClick={() => handleDeleteEventAndClose(eventDetails.event.id)} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                      Delete event
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[#64748b] py-4">Could not load event details.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unattend user reason modal */}
      {unattendModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={closeUnattendModal}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Unattend user from event</h3>
            {unattendModal.eventTitle && <p className="text-sm text-gray-600 mb-4">{unattendModal.eventTitle}</p>}
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason (required)</label>
            <textarea
              value={unattendReason}
              onChange={(e) => setUnattendReason(e.target.value)}
              placeholder="Provide a reason for unattending this user..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e6b4e] focus:border-[#2e6b4e] text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeUnattendModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnattendUser}
                disabled={!unattendReason.trim() || unattendSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {unattendSubmitting ? "Unattending…" : "Unattend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
