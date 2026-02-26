import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getEvents, getCategories, checkFavorite, addFavorite, removeFavorite, checkRSVPStatus } from "../../api";
import EventCard from "../../components/events/EventCard";

const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

// Format date from database (starts_at) to readable format
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
  if (!address1) {
    return String(event?.location ?? "").trim();
  }

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_URL}${imagePath}`;
}

function BrowseEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [radius, setRadius] = useState(10); // Default 10 miles
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [quickFilter, setQuickFilter] = useState(searchParams.get("filter") || ""); // Today, This Week, Free, Popular
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState(["All"]);
  const [favoritesMap, setFavoritesMap] = useState({});
  const [rsvpMap, setRsvpMap] = useState({});

  // Sync search and category from URL on mount / when URL changes
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const cat = searchParams.get("category") || "All";
    const filt = searchParams.get("filter") || "";
    setSearchQuery(search);
    setSelectedCategory(cat);
    setQuickFilter(filt);
  }, [searchParams]);

  useEffect(() => {
    getCategories().then((list) => setCategories(["All", ...(list || [])])).catch(() => {});
  }, []);

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!localStorage.getItem("eventure_token");
  };

  // Handle event card click - redirect to login if not authenticated
  const handleEventClick = (e, eventId) => {
    if (!isAuthenticated()) {
      e.preventDefault();
      navigate("/login", { state: { returnTo: `/events/${eventId}` } });
    }
    // If authenticated, let the Link handle navigation normally
  };

  // Handle ZIP input - strip non-digits and cap at 5
  const handleZipChange = (e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 5);
    setZipCode(digitsOnly);
  };

  // Check if ZIP is valid (exactly 5 digits)
  const isValidZip = /^\d{5}$/.test(zipCode);

  // Check favorite status for events
  const checkFavoritesForEvents = async (eventIds) => {
    // Check if user is authenticated first
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      // Not authenticated, set all to false
      const newFavoritesMap = {};
      eventIds.forEach((id) => {
        newFavoritesMap[id] = false;
      });
      setFavoritesMap(newFavoritesMap);
      return;
    }

    try {
      const favoriteChecks = await Promise.all(
        eventIds.map(async (id) => {
          try {
            const result = await checkFavorite(id);
            return { id, isFavorited: result.isFavorited || false };
          } catch (err) {
            // Log error for debugging
            console.warn(`Failed to check favorite for event ${id}:`, err.message);
            // If error, default to false
            return { id, isFavorited: false };
          }
        })
      );
      
      const newFavoritesMap = {};
      favoriteChecks.forEach(({ id, isFavorited }) => {
        newFavoritesMap[id] = isFavorited;
      });
      setFavoritesMap(newFavoritesMap);
    } catch (err) {
      console.error("Failed to check favorites:", err);
      // On error, set all to false
      const newFavoritesMap = {};
      eventIds.forEach((id) => {
        newFavoritesMap[id] = false;
      });
      setFavoritesMap(newFavoritesMap);
    }
  };

  // Check RSVP status for events
  const checkRSVPsForEvents = async (eventIds) => {
    // Check if user is authenticated first
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      // Not authenticated, set all to false
      const newRsvpMap = {};
      eventIds.forEach((id) => {
        newRsvpMap[id] = false;
      });
      setRsvpMap(newRsvpMap);
      return;
    }

    try {
      const rsvpChecks = await Promise.all(
        eventIds.map(async (id) => {
          try {
            const result = await checkRSVPStatus(id);
            return { id, isRsvped: result.isRsvped || false };
          } catch (err) {
            // Log error for debugging
            console.warn(`Failed to check RSVP for event ${id}:`, err.message);
            // If error, default to false
            return { id, isRsvped: false };
          }
        })
      );
      
      const newRsvpMap = {};
      rsvpChecks.forEach(({ id, isRsvped }) => {
        newRsvpMap[id] = isRsvped;
      });
      setRsvpMap(newRsvpMap);
    } catch (err) {
      console.error("Failed to check RSVPs:", err);
      // On error, set all to false
      const newRsvpMap = {};
      eventIds.forEach((id) => {
        newRsvpMap[id] = false;
      });
      setRsvpMap(newRsvpMap);
    }
  };

  // Update URL when filters change
  useEffect(() => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
    if (quickFilter) params.filter = quickFilter;
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, quickFilter, setSearchParams]);

  // Fetch events when filters change (category, zip, radius)
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        
        // If ZIP is invalid (not 5 digits), show 0 results without API call
        if (zipCode && !isValidZip) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const params = {};
        
        // Category filter
        if (selectedCategory && selectedCategory !== "All") {
          params.category = selectedCategory;
        }
        
        // Only call API if ZIP is valid (5 digits) and radius is set
        if (isValidZip && zipCode) {
          params.zip = zipCode;
          params.radius = radius;
        }
        // If ZIP is empty, fetch all events (no radius filter)

        const data = await getEvents(params);
        setEvents(data || []);
        
        // Check favorite status for filtered events
        if (data && data.length > 0) {
          const eventIds = data.map((e) => parseInt(e.id, 10)).filter((id) => !isNaN(id));
          if (eventIds.length > 0) {
            await checkFavoritesForEvents(eventIds);
            await checkRSVPsForEvents(eventIds);
          }
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setError(err.message || "Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [zipCode, radius, isValidZip, selectedCategory]);

  // Client-side search + quick filter (Today, This Week, Free, Popular)
  const filteredEvents = useMemo(() => {
    let list = events;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((event) => {
        const title = (event.title || "").toLowerCase();
        const desc = (event.description || "").toLowerCase();
        const addr = buildFullAddress(event).toLowerCase();
        const cat = (event.category || "").toLowerCase();
        const venue = (event.venue || "").toLowerCase();
        return (
          title.includes(q) ||
          desc.includes(q) ||
          addr.includes(q) ||
          cat.includes(q) ||
          venue.includes(q)
        );
      });
    }

    // Quick filters (Today, This Week, Free, Popular)
    if (quickFilter === "Today") {
      const today = new Date().toDateString();
      list = list.filter((e) => e.starts_at && new Date(e.starts_at).toDateString() === today);
    } else if (quickFilter === "This Week") {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      list = list.filter((e) => {
        const d = e.starts_at ? new Date(e.starts_at) : null;
        return d && d >= now && d <= weekEnd;
      });
    } else if (quickFilter === "Free") {
      list = list.filter((e) => !e.ticket_price || Number(e.ticket_price) === 0);
    } else if (quickFilter === "Popular") {
      list = [...list].sort((a, b) => (b.rsvp_count || 0) - (a.rsvp_count || 0));
    }

    return list;
  }, [events, searchQuery, quickFilter]);

  // Handle favorite click
  const handleFavoriteClick = async (eventId, willBeFavorited) => {
    // Check if user is authenticated
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      alert("Please log in to favorite events");
      return;
    }

    try {
      if (willBeFavorited) {
        await addFavorite(eventId);
      } else {
        await removeFavorite(eventId);
      }
      // Update local state immediately for better UX
      setFavoritesMap((prev) => ({
        ...prev,
        [eventId]: willBeFavorited,
      }));
    } catch (err) {
      console.error("Failed to update favorite:", err);
      alert(err.message || "Failed to update favorite. Please try again.");
      // Revert the change on error
      setFavoritesMap((prev) => ({
        ...prev,
        [eventId]: !willBeFavorited,
      }));
    }
  };

  const hasActiveFilters = selectedCategory !== "All" || zipCode || quickFilter;
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setZipCode("");
    setQuickFilter("");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0f172b] mb-2">Browse Events</h1>
          <p className="text-[#64748b] text-lg">
            Discover events near you — search, filter by category or location, and save your favorites.
          </p>
        </div>

        {/* Search and Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Search</label>
                <input
                  type="text"
                  placeholder="Search by title, location, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent transition-shadow"
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-28">
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">ZIP code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="02910"
                  value={zipCode}
                  onChange={handleZipChange}
                  maxLength={5}
                  className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                />
              </div>
              {isValidZip && (
                <div className="w-full sm:w-28">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Within</label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number.parseInt(e.target.value, 10))}
                    className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent cursor-pointer"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r} mi</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel((prev) => !prev)}
                  className={`h-11 px-5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                    showFiltersPanel ? "bg-[#2e6b4e] text-white" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filters {showFiltersPanel ? "▲" : "▼"}
                </button>
              </div>
            </div>

            {/* Quick filter pills - always visible */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e8f0]">
              <span className="text-xs font-medium text-[#64748b] mr-1">Quick:</span>
              {["Today", "This Week", "Free", "Popular"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setQuickFilter(quickFilter === f ? "" : f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    quickFilter === f ? "bg-[#2e6b4e] text-white shadow-sm" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Expandable panel (same options, compact) */}
            {showFiltersPanel && (
              <div className="pt-4 mt-2 border-t border-[#e2e8f0] flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:ring-2 focus:ring-[#2e6b4e]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat === "All" ? "All" : cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">ZIP</label>
                  <input
                    type="text"
                    placeholder="02910"
                    value={zipCode}
                    onChange={handleZipChange}
                    maxLength={5}
                    className="h-10 px-3 w-24 rounded-lg border border-[#e2e8f0] text-sm focus:ring-2 focus:ring-[#2e6b4e]"
                  />
                </div>
                {isValidZip && (
                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Radius</label>
                    <select
                      value={radius}
                      onChange={(e) => setRadius(Number.parseInt(e.target.value, 10))}
                      className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:ring-2 focus:ring-[#2e6b4e]"
                    >
                      {RADIUS_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r} miles</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results bar + view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <p className="text-[#475569] font-medium">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#2e6b4e]/30 border-t-[#2e6b4e] rounded-full animate-spin" />
                  Loading events...
                </span>
              ) : (
                <span className="text-[#0f172b]">{filteredEvents.length}</span>
              )}
              {!loading && <span className="text-[#64748b]"> event{filteredEvents.length !== 1 ? "s" : ""}</span>}
            </p>
            {hasActiveFilters && !loading && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-[#2e6b4e] hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748b] mr-1">View:</span>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl transition-colors ${viewMode === "grid" ? "bg-[#2e6b4e] text-white shadow-sm" : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"}`}
              aria-label="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-xl transition-colors ${viewMode === "list" ? "bg-[#2e6b4e] text-white shadow-sm" : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"}`}
              aria-label="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Events Grid/List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#2e6b4e]/20 border-t-[#2e6b4e] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b] font-medium">Loading events...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center max-w-xl mx-auto">
            <p className="text-red-600 font-medium mb-2">Something went wrong</p>
            <p className="text-[#64748b] text-sm">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43]">Try again</button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0f172b] mb-2">No events found</h2>
            <p className="text-[#64748b] text-sm mb-4">
              {searchQuery.trim() ? `No events match "${searchQuery}"` : quickFilter ? `No ${quickFilter.toLowerCase()} events right now.` : "Try adjusting your filters or search."}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="px-5 py-2.5 rounded-xl bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43] transition-colors">
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => handleEventClick(e, event.id)}
                className="focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:rounded-2xl cursor-pointer"
              >
                {isAuthenticated() ? (
                  <Link
                    to={`/events/${event.id}`}
                    className="block"
                  >
                    <EventCard
                      eventId={parseInt(event.id, 10)}
                      title={event.title}
                      date={formatEventDate(event.starts_at)}
                      location={buildFullAddress(event)}
                      category={event.category}
                      price={event.ticket_price != null ? Number(event.ticket_price) : null}
                      imageUrl={getImageUrl(event.main_image)}
                      isFavorited={favoritesMap[parseInt(event.id, 10)] || false}
                      isRsvped={rsvpMap[parseInt(event.id, 10)] || false}
                      onFavoriteClick={handleFavoriteClick}
                      capacity={event.capacity !== null && event.capacity !== undefined ? event.capacity : null}
                      rsvpCount={event.rsvp_count !== null && event.rsvp_count !== undefined ? event.rsvp_count : 0}
                    />
                  </Link>
                ) : (
                  <EventCard
                    eventId={parseInt(event.id, 10)}
                    title={event.title}
                    date={formatEventDate(event.starts_at)}
                    location={buildFullAddress(event)}
                    category={event.category}
                    price={event.ticket_price != null ? Number(event.ticket_price) : null}
                    imageUrl={getImageUrl(event.main_image)}
                    isFavorited={false}
                    isRsvped={false}
                    onFavoriteClick={handleFavoriteClick}
                    capacity={event.capacity !== null && event.capacity !== undefined ? event.capacity : null}
                    rsvpCount={event.rsvp_count !== null && event.rsvp_count !== undefined ? event.rsvp_count : 0}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => handleEventClick(e, event.id)}
                className="block focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:rounded-2xl cursor-pointer"
              >
                {isAuthenticated() ? (
                  <Link
                    to={`/events/${event.id}`}
                    className="block"
                  >
                    <EventCard
                      eventId={parseInt(event.id, 10)}
                      title={event.title}
                      date={formatEventDate(event.starts_at)}
                      location={buildFullAddress(event)}
                      category={event.category}
                      price={event.ticket_price != null ? Number(event.ticket_price) : null}
                      imageUrl={getImageUrl(event.main_image)}
                      viewMode="list"
                      isFavorited={favoritesMap[parseInt(event.id, 10)] || false}
                      isRsvped={rsvpMap[parseInt(event.id, 10)] || false}
                      onFavoriteClick={handleFavoriteClick}
                      capacity={event.capacity !== null && event.capacity !== undefined ? event.capacity : null}
                      rsvpCount={event.rsvp_count !== null && event.rsvp_count !== undefined ? event.rsvp_count : 0}
                    />
                  </Link>
                ) : (
                  <EventCard
                    eventId={parseInt(event.id, 10)}
                    title={event.title}
                    date={formatEventDate(event.starts_at)}
                    location={buildFullAddress(event)}
                    category={event.category}
                    price={event.ticket_price != null ? Number(event.ticket_price) : null}
                    imageUrl={getImageUrl(event.main_image)}
                    viewMode="list"
                    isFavorited={false}
                    isRsvped={false}
                    onFavoriteClick={handleFavoriteClick}
                    capacity={event.capacity !== null && event.capacity !== undefined ? event.capacity : null}
                    rsvpCount={event.rsvp_count !== null && event.rsvp_count !== undefined ? event.rsvp_count : 0}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowseEventsPage;
