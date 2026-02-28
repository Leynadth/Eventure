import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getFavorites, removeFavorite, clearAllFavorites, checkRSVPStatus } from "../../api";
import AppShell from "../../components/layout/AppShell";
import EventCard from "../../components/events/EventCard";
import { useNotification } from "../../contexts/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_URL}${imagePath}`;
}

function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildFullAddress(event) {
  const address1 = String(event?.address_line1 ?? "").trim();
  if (!address1) return String(event?.location ?? "").trim();
  const parts = [];
  const venue = String(event?.venue ?? "").trim();
  const address2 = String(event?.address_line2 ?? "").trim();
  const city = String(event?.city ?? "").trim();
  const state = String(event?.state ?? "").trim();
  const zip = String(event?.zip_code ?? "").trim();
  if (venue) parts.push(venue);
  parts.push(address1);
  if (address2) parts.push(address2);
  const cityStateZip = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
  if (cityStateZip.trim()) parts.push(cityStateZip.trim());
  return parts.join(", ");
}

const SORT_OPTIONS = [
  { value: "date", label: "Date (soonest first)" },
  { value: "name", label: "Name A–Z" },
  { value: "category", label: "Category" },
];

function FavoritesPage() {
  const { toast } = useNotification();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rsvpMap, setRsvpMap] = useState({});
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState("grid");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  const checkRSVPsForEvents = async (eventIds) => {
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      setRsvpMap(Object.fromEntries(eventIds.map((id) => [id, false])));
      return;
    }
    try {
      const results = await Promise.all(
        eventIds.map(async (id) => {
          try {
            const result = await checkRSVPStatus(id);
            return { id, isRsvped: result.isRsvped || false };
          } catch {
            return { id, isRsvped: false };
          }
        })
      );
      setRsvpMap(Object.fromEntries(results.map((r) => [r.id, r.isRsvped])));
    } catch {
      setRsvpMap(Object.fromEntries(eventIds.map((id) => [id, false])));
    }
  };

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("eventure_token");
        if (!token) {
          setError("Please log in to view your favorites");
          setFavorites([]);
          setLoading(false);
          return;
        }
        const data = await getFavorites();
        setFavorites(data || []);
        if (data?.length > 0) {
          const eventIds = data.map((e) => parseInt(e.id, 10)).filter((id) => !isNaN(id));
          await checkRSVPsForEvents(eventIds);
        }
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
        setError(
          err.message?.includes("Authentication")
            ? "Please log in to view your favorites"
            : err.message || "Failed to load favorites"
        );
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, []);

  const categoriesInFavorites = useMemo(() => {
    const set = new Set();
    favorites.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [favorites]);

  const filteredAndSortedFavorites = useMemo(() => {
    let list = categoryFilter
      ? favorites.filter((e) => e.category === categoryFilter)
      : [...favorites];
    if (sortBy === "date") {
      list.sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
    } else if (sortBy === "name") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "category") {
      list.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    }
    return list;
  }, [favorites, sortBy, categoryFilter]);

  const rsvpCount = useMemo(
    () => Object.values(rsvpMap).filter(Boolean).length,
    [rsvpMap]
  );

  const handleFavoriteClick = async (eventId, willBeFavorited) => {
    if (willBeFavorited) return;
    try {
      await removeFavorite(eventId);
      setFavorites((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to remove favorite:", err);
      toast(err.message || "Failed to remove favorite. Please try again.", "error");
    }
  };

  const handleClearAll = async () => {
    if (!clearAllConfirm) {
      setClearAllConfirm(true);
      return;
    }
    try {
      await clearAllFavorites();
      setFavorites([]);
      setClearAllConfirm(false);
    } catch (err) {
      console.error("Failed to clear favorites:", err);
      toast(err.message || "Failed to clear favorites.", "error");
    }
  };

  return (
    <AppShell>
      <div className="min-h-0 bg-[#f8fafc] font-[Arimo,sans-serif]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Hero header */}
          <div className="mb-8 sm:mb-10 rounded-2xl bg-gradient-to-br from-[#2e6b4e] to-[#255a43] px-6 py-8 sm:px-8 sm:py-10 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Favorites</h1>
            </div>
            <p className="text-white/90 text-base sm:text-lg max-w-xl">
              Events you&apos;ve saved for later. RSVP from here or open any event for details.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{error}</span>
              {error.includes("log in") && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl font-medium hover:bg-[#255a43] transition-colors shrink-0"
                >
                  Go to Login
                </Link>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24">
              <div className="w-12 h-12 rounded-full border-2 border-[#2e6b4e] border-t-transparent animate-spin mb-4" />
              <p className="text-[#64748b] font-medium">Loading your favorites...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden text-center py-14 sm:py-20 px-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#2e6b4e]/10 text-[#2e6b4e] mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#0f172b] mb-2">No favorites yet</h2>
              <p className="text-[#64748b] max-w-sm mx-auto mb-8">
                Save events from Browse or event details with the heart icon. They&apos;ll show up here.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors shadow-sm"
              >
                Browse events
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <>
              {/* Stats + toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[#0f172b] font-medium shadow-sm">
                    {favorites.length} saved
                  </span>
                  {rsvpCount > 0 && (
                    <span className="px-3 py-1.5 rounded-lg bg-[#2e6b4e]/10 text-[#2e6b4e] font-medium">
                      {rsvpCount} you&apos;re attending
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#cad5e2] text-[#314158] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                    aria-label="Sort by"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {categoriesInFavorites.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#cad5e2] text-[#314158] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                      aria-label="Filter by category"
                    >
                      <option value="">All categories</option>
                      {categoriesInFavorites.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex rounded-lg border border-[#e2e8f0] bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-[#2e6b4e] text-white" : "text-[#64748b] hover:text-[#0f172b]"}`}
                      aria-label="Grid view"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-[#2e6b4e] text-white" : "text-[#64748b] hover:text-[#0f172b]"}`}
                      aria-label="List view"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    </button>
                  </div>
                  {clearAllConfirm ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                      >
                        Confirm clear all
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearAllConfirm(false)}
                        className="px-3 py-2 rounded-lg border border-[#cad5e2] text-[#314158] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClearAllConfirm(true)}
                      className="px-3 py-2 rounded-lg border border-[#e2e8f0] text-[#64748b] text-sm font-medium hover:border-red-200 hover:text-red-600 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Results count when filtered */}
              {categoryFilter && (
                <p className="text-sm text-[#64748b] mb-4">
                  Showing {filteredAndSortedFavorites.length} in <span className="font-medium text-[#0f172b]">{categoryFilter}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("")}
                    className="ml-2 text-[#2e6b4e] hover:underline"
                  >
                    Clear filter
                  </button>
                </p>
              )}

              {/* Event cards */}
              <div
                className={
                  viewMode === "list"
                    ? "space-y-4"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                }
              >
                {filteredAndSortedFavorites.map((event) => {
                  const dateText = formatEventDate(event.starts_at);
                  const addressText = buildFullAddress(event);
                  const imageUrl = event.main_image ? getImageUrl(event.main_image) : null;
                  const isRsvped = rsvpMap[event.id] || false;
                  return (
                    <EventCard
                      key={event.id}
                      eventId={event.id}
                      title={event.title}
                      date={dateText}
                      location={addressText}
                      category={event.category}
                      price={event.ticket_price || 0}
                      imageUrl={imageUrl}
                      viewMode={viewMode}
                      isFavorited={true}
                      isRsvped={isRsvped}
                      onFavoriteClick={handleFavoriteClick}
                      capacity={event.capacity}
                      rsvpCount={event.rsvp_count || 0}
                    />
                  );
                })}
              </div>

              {filteredAndSortedFavorites.length === 0 && categoryFilter && (
                <div className="text-center py-12 text-[#64748b]">
                  No favorites in this category.{" "}
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("")}
                    className="text-[#2e6b4e] font-medium hover:underline"
                  >
                    Show all
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default FavoritesPage;
