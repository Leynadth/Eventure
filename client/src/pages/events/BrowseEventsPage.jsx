import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getEvents, getCategories, getLocationFromCoords, checkFavorite, addFavorite, removeFavorite, checkRSVPStatus } from "../../api";
import EventCard from "../../components/events/EventCard";

const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

const QUICK_FILTER_OPTIONS = [
  { id: "Today", label: "Today", icon: "calendar-day" },
  { id: "This Week", label: "This Week", icon: "calendar-week" },
  { id: "Free", label: "Free", icon: "tag" },
  { id: "Popular", label: "Popular", icon: "trending" },
];

// US states + DC for state filter (full names; backend matches case-insensitive)
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
  "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

// Map common abbreviations to full state name for dropdown match
const STATE_ABBREV_TO_FULL = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

function normalizeStateForDropdown(stateStr) {
  if (!stateStr || typeof stateStr !== "string") return "All";
  const trimmed = stateStr.trim();
  if (!trimmed) return "All";
  const upper = trimmed.toUpperCase();
  if (STATE_ABBREV_TO_FULL[upper]) return STATE_ABBREV_TO_FULL[upper];
  const match = US_STATES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed;
}

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
  const [selectedState, setSelectedState] = useState(searchParams.get("state") || "All");
  const [quickFilter, setQuickFilter] = useState(searchParams.get("filter") || ""); // Today, This Week, Free, Popular
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState(["All"]);
  const [favoritesMap, setFavoritesMap] = useState({});
  const [rsvpMap, setRsvpMap] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Sync search, category, and state from URL on mount / when URL changes
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const cat = searchParams.get("category") || "All";
    const st = searchParams.get("state") || "All";
    const filt = searchParams.get("filter") || "";
    setSearchQuery(search);
    setSelectedCategory(cat);
    setSelectedState(st);
    setQuickFilter(filt);
  }, [searchParams]);

  useEffect(() => {
    getCategories().then((list) => setCategories(["All", ...(list || [])])).catch(() => {});
  }, []);

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!localStorage.getItem("eventure_token");
  };

  // Handle ZIP input - strip non-digits and cap at 5
  const handleZipChange = (e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 5);
    setZipCode(digitsOnly);
  };

  // Check if ZIP is valid (exactly 5 digits)
  const isValidZip = /^\d{5}$/.test(zipCode);

  const handleUseLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await getLocationFromCoords(latitude, longitude);
          const stateVal = data?.state ? normalizeStateForDropdown(data.state) : "All";
          const zipVal = data?.zip_code ? String(data.zip_code).replace(/\D/g, "").slice(0, 5) : "";
          setSelectedState(stateVal);
          setZipCode(zipVal);
          if (!zipVal) setLocationError("Could not detect ZIP; state was set.");
        } catch (err) {
          setLocationError(err.message || "Could not get address for your location.");
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location access denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

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

        // State filter
        if (selectedState && selectedState !== "All") {
          params.state = selectedState;
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
  }, [zipCode, radius, isValidZip, selectedCategory, selectedState]);

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

  const hasActiveFilters = selectedCategory !== "All" || selectedState !== "All" || zipCode || quickFilter;
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedState("All");
    setZipCode("");
    setQuickFilter("");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex gap-4">
          <div className="w-1 rounded-full bg-[#2e6b4e] shrink-0" aria-hidden />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0f172b] mb-1.5">Browse Events</h1>
            <p className="text-[#64748b] text-base sm:text-lg max-w-xl">
              Discover events across the US — search by keyword, filter by category or location, and save your favorites.
            </p>
          </div>
        </div>

        {/* Search and Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden mb-6">
          {/* Main search + category + state + Filters button */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-[#64748b] mb-1.5 uppercase tracking-wide">Search</label>
                <input
                  type="text"
                  placeholder="Search by title, location, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent transition-shadow"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 lg:gap-5">
                <div className="w-full sm:w-36">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5 uppercase tracking-wide">Category</label>
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
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5 uppercase tracking-wide">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent cursor-pointer"
                    title="Leave as All States to see events from any state within your ZIP radius"
                  >
                    <option value="All">All States</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowFiltersDropdown((prev) => !prev)}
                    className={`h-11 px-5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      showFiltersDropdown ? "bg-[#2e6b4e] text-white" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] border border-[#e2e8f0]"
                    }`}
                    aria-expanded={showFiltersDropdown}
                    aria-haspopup="true"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filters
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showFiltersDropdown ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dropdown panel: Location + Quick filters (shown when Filters clicked) */}
          {showFiltersDropdown && (
            <div className="border-t border-[#e2e8f0] bg-[#f8fafc]/50">
              {/* Location */}
              <div className="px-5 sm:px-6 py-4 border-b border-[#e2e8f0]/80">
                <p className="text-xs font-medium text-[#64748b] mb-3 uppercase tracking-wide">Location</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
                  <div className="w-full sm:w-28">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="ZIP code"
                      value={zipCode}
                      onChange={handleZipChange}
                      maxLength={5}
                      className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent bg-white"
                    />
                  </div>
                  {isValidZip && (
                    <div className="w-full sm:w-24">
                      <select
                        value={radius}
                        onChange={(e) => setRadius(Number.parseInt(e.target.value, 10))}
                        className="w-full h-11 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172b] bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent cursor-pointer"
                        aria-label="Radius in miles"
                      >
                        {RADIUS_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r} mi</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locationLoading}
                    className="h-11 px-4 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2 bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9] hover:border-[#cbd5e1] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    title="Fill state and ZIP from your device location"
                  >
                    {locationLoading ? (
                      <span className="w-4 h-4 border-2 border-[#2e6b4e]/30 border-t-[#2e6b4e] rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    )}
                    {locationLoading ? "Getting location…" : "Use my location"}
                  </button>
                </div>
                {locationError && (
                  <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">{locationError}</p>
                )}
              </div>

              {/* Quick filters */}
              <div className="px-5 sm:px-6 py-4">
                <p className="text-xs font-medium text-[#64748b] mb-3 uppercase tracking-wide">Quick filters</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTER_OPTIONS.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setQuickFilter(quickFilter === id ? "" : id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        quickFilter === id ? "bg-[#2e6b4e] text-white shadow-sm" : "bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"
                      }`}
                    >
                      {icon === "calendar-day" && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      )}
                      {icon === "calendar-week" && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="16" y1="14" x2="16" y2="14.01" /></svg>
                      )}
                      {icon === "tag" && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                      )}
                      {icon === "trending" && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active filters chips */}
        {hasActiveFilters && !loading && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-medium text-[#64748b] mr-1">Active:</span>
            {selectedCategory !== "All" && (
              <button type="button" onClick={() => setSelectedCategory("All")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2e6b4e]/10 text-[#2e6b4e] text-sm font-medium hover:bg-[#2e6b4e]/20 transition-colors">
                {selectedCategory} <span aria-hidden>×</span>
              </button>
            )}
            {selectedState !== "All" && (
              <button type="button" onClick={() => setSelectedState("All")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2e6b4e]/10 text-[#2e6b4e] text-sm font-medium hover:bg-[#2e6b4e]/20 transition-colors">
                {selectedState} <span aria-hidden>×</span>
              </button>
            )}
            {zipCode && (
              <button type="button" onClick={() => setZipCode("")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2e6b4e]/10 text-[#2e6b4e] text-sm font-medium hover:bg-[#2e6b4e]/20 transition-colors">
                {zipCode}{isValidZip ? ` · ${radius} mi` : ""} <span aria-hidden>×</span>
              </button>
            )}
            {quickFilter && (
              <button type="button" onClick={() => setQuickFilter("")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2e6b4e]/10 text-[#2e6b4e] text-sm font-medium hover:bg-[#2e6b4e]/20 transition-colors">
                {quickFilter} <span aria-hidden>×</span>
              </button>
            )}
            <button type="button" onClick={clearFilters} className="text-sm text-[#64748b] hover:text-[#2e6b4e] font-medium ml-1">
              Clear all
            </button>
          </div>
        )}

        {/* Results bar + view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 py-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-4">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-[#64748b] font-medium">
                <span className="w-4 h-4 border-2 border-[#2e6b4e]/30 border-t-[#2e6b4e] rounded-full animate-spin" />
                Loading events...
              </span>
            ) : (
              <p className="text-[#0f172b] font-semibold">
                <span className="text-[#2e6b4e]">{filteredEvents.length}</span>
                <span className="text-[#64748b] font-normal ml-1">event{filteredEvents.length !== 1 ? "s" : ""}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white text-[#2e6b4e] shadow-sm" : "text-[#64748b] hover:text-[#0f172b]"}`}
              aria-label="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white text-[#2e6b4e] shadow-sm" : "text-[#64748b] hover:text-[#0f172b]"}`}
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
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-10 sm:p-14 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0f172b] mb-2">No events found</h2>
            <p className="text-[#64748b] text-sm mb-1">
              {searchQuery.trim() ? `No events match "${searchQuery}".` : quickFilter ? `No ${quickFilter.toLowerCase()} events right now.` : "Try a different search or filter."}
            </p>
            <p className="text-[#94a3b8] text-xs mb-6">
              Tip: Use a larger radius or set State to “All States” to see more events.
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="px-5 py-2.5 rounded-xl bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43] transition-colors shadow-sm">
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:rounded-2xl cursor-pointer"
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
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:rounded-2xl cursor-pointer"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowseEventsPage;
