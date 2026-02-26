import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getEventById,
  checkFavorite,
  addFavorite,
  removeFavorite,
  rsvpToEvent,
  cancelRSVP,
  checkRSVPStatus,
  getEventDiscussion,
  postEventDiscussion,
} from "../../api";
import EventMap from "../../components/EventMap";

function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTimeRange(startsAt, endsAt) {
  if (!startsAt && !endsAt) return "";
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  const fmt = (d) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return fmt(start);
  return fmt(end);
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

/**
 * Returns a clean, non-repetitive address for display: { line1, line2 }.
 * Dedupes venue/city-state-zip and trims verbose place strings (e.g. from Google autocomplete).
 */
function getDisplayAddress(event) {
  const venue = String(event?.venue ?? "").trim();
  const address1 = String(event?.address_line1 ?? "").trim();
  const city = String(event?.city ?? "").trim();
  const state = String(event?.state ?? "").trim();
  const zip = String(event?.zip_code ?? "").trim();
  const cityStateZip = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}`.trim() : "").trim();

  if (!address1 && !venue && !cityStateZip) {
    const loc = String(event?.location ?? "").trim();
    return loc ? { line1: loc, line2: null } : { line1: null, line2: null };
  }

  // When we have structured city/state/zip, show a short line1 (venue + street) and line2 = "City, State Zip"
  if (cityStateZip && address1) {
    let streetPart = address1
      .replace(/,?\s*United States\s*$/i, "")
      .trim();
    // Remove duplicate "City, State Zip" everywhere (so it only appears once on line2)
    const escaped = cityStateZip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    streetPart = streetPart.replace(new RegExp(`,?\\s*${escaped}\\s*,?`, "gi"), ",").trim();
    // Strip county for brevity (e.g. "Kent County")
    streetPart = streetPart.replace(/,?\s*[^,]*\s+County\s*,?/gi, ",").replace(/,+/g, ",").replace(/^,|,$/g, "").trim();
    // If venue is at the start of streetPart, don't repeat it
    const venueInStreet = venue && streetPart.toLowerCase().startsWith(venue.toLowerCase());
    const line1Parts = [];
    if (venue && !venueInStreet) line1Parts.push(venue);
    if (streetPart) line1Parts.push(streetPart);
    const line1 = line1Parts.length ? line1Parts.join(", ") : cityStateZip;
    return { line1, line2: cityStateZip };
  }

  // No structured city/state/zip: clean long address1 and show as one or two lines
  if (address1) {
    let cleaned = address1.replace(/,?\s*United States\s*$/i, "").trim();
    cleaned = cleaned.replace(/,?\s*[^,]*\s+County\s*,?/gi, ",").replace(/,+/g, ",").replace(/^,|,$/g, "").trim();
    const venueInAddr = venue && cleaned.toLowerCase().startsWith(venue.toLowerCase());
    const line1 = (venue && !venueInAddr ? venue + ", " : "") + cleaned;
    return { line1, line2: null };
  }

  return { line1: venue || cityStateZip || null, line2: venue && cityStateZip ? cityStateZip : null };
}

/** "In X days", "Tomorrow", "Today", or "" if past */
function getCountdownLabel(startsAt) {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

/** Google Calendar "Add to calendar" URL */
function getGoogleCalendarUrl(event) {
  const start = event?.starts_at ? new Date(event.starts_at) : null;
  const end = event?.ends_at ? new Date(event.ends_at) : start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null;
  if (!start) return "#";
  const format = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, 15);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: (event?.title || "Event").replace(/&/g, "and"),
    dates: `${format(start)}/${end ? format(end) : format(start)}`,
  });
  if (event?.venue || event?.address_line1) {
    params.set("location", buildFullAddress(event));
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function parseTags(tagsStr) {
  if (!tagsStr || typeof tagsStr !== "string") return [];
  return tagsStr.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
}

function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEventById(id);
        setEvent(data);
        
        // Check if event is favorited
        try {
          const favoriteCheck = await checkFavorite(id);
          setIsFavorited(favoriteCheck.isFavorited);
        } catch (err) {
          // If not authenticated, default to false
          setIsFavorited(false);
        }

        // Check RSVP status
        try {
          const rsvpCheck = await checkRSVPStatus(id);
          setIsRsvped(rsvpCheck.isRsvped);
        } catch (err) {
          setIsRsvped(false);
        }

        // Load comments (uses event_discussion table)
        try {
          const disc = await getEventDiscussion(id);
          setComments(disc.posts || []);
        } catch (e) {
          console.warn("Event comments failed (ensure backend and DB have event_discussion table):", e?.message || e);
          setComments([]);
        }

      } catch (err) {
        console.error("Failed to fetch event:", err);
        setError(err.message || "Failed to load event");
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Lightbox keyboard/scroll - must be at top level (Rules of Hooks: same # of hooks every render)
  useEffect(() => {
    if (!lightboxOpen) return;
    const n = [event?.main_image, event?.image_2, event?.image_3, event?.image_4].filter(Boolean).length;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (n > 0 && e.key === "ArrowLeft") setCurrentImageIndex((p) => (p - 1 + n) % n);
      if (n > 0 && e.key === "ArrowRight") setCurrentImageIndex((p) => (p + 1) % n);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, event?.main_image, event?.image_2, event?.image_3, event?.image_4]);

  const handleFavoriteClick = async () => {
    // Check if user is authenticated
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      navigate("/login", { state: { returnTo: `/events/${id}` } });
      return;
    }

    try {
      const willBeFavorited = !isFavorited;
      if (willBeFavorited) {
        await addFavorite(id);
      } else {
        await removeFavorite(id);
      }
      setIsFavorited(willBeFavorited);
    } catch (err) {
      console.error("Failed to update favorite:", err);
      alert(err.message || "Failed to update favorite. Please try again.");
    }
  };

  const handleRSVP = async () => {
    // Check if user is authenticated
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      navigate("/login", { state: { returnTo: `/events/${id}` } });
      return;
    }

    try {
      setRsvpLoading(true);
      if (isRsvped) {
        await cancelRSVP(id);
        setIsRsvped(false);
        // Refresh event to update RSVP count
        const updatedEvent = await getEventById(id);
        setEvent(updatedEvent);
      } else {
        await rsvpToEvent(id);
        setIsRsvped(true);
        // Refresh event to update RSVP count
        const updatedEvent = await getEventById(id);
        setEvent(updatedEvent);
      }
    } catch (err) {
      console.error("Failed to update RSVP:", err);
      alert(err.message || "Failed to update RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const msg = commentMessage.trim();
    if (!msg) return;
    const token = localStorage.getItem("eventure_token");
    if (!token) {
      navigate("/login", { state: { returnTo: `/events/${id}` } });
      return;
    }
    try {
      setCommentSubmitting(true);
      await postEventDiscussion(id, msg);
      setCommentMessage("");
      const disc = await getEventDiscussion(id);
      setComments(disc.posts || []);
    } catch (err) {
      alert(err.message || "Failed to post comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2e6b4e]/30 border-t-[#2e6b4e] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#45556c] font-medium">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl bg-white shadow-lg border border-[#e2e8f0] p-10">
          <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0f172b] mb-2">Event not found</h1>
          <p className="text-[#64748b] mb-6">
            {error || "The event you're looking for doesn't exist or has been removed."}
          </p>
          <Link to="/browse" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl font-medium hover:bg-[#255a43] transition-colors">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  const addressText = buildFullAddress(event); // full string for map/calendar
  const displayAddress = getDisplayAddress(event); // clean { line1, line2 } for UI
  const dateText = formatEventDate(event?.starts_at);
  const timeText = formatEventTimeRange(event?.starts_at, event?.ends_at);
  const countdownLabel = getCountdownLabel(event?.starts_at);
  const tagsList = parseTags(event?.tags);
  const ticketPrice = event?.ticket_price != null ? Number(event.ticket_price) : null;
  const isFree = ticketPrice == null || ticketPrice === 0 || Number.isNaN(ticketPrice);
  const priceLabel = isFree ? "Free" : `$${(ticketPrice ?? 0).toFixed(2)}`;
  const spotsLeft = event?.capacity != null ? Math.max(0, (event.capacity || 0) - (event?.rsvp_count || 0)) : null;
  const isAlmostFull = spotsLeft != null && spotsLeft > 0 && spotsLeft <= Math.min(10, Math.ceil((event?.capacity || 0) * 0.2));

  // Collect all available images (main_image + image_2, image_3, image_4)
  const allImages = [
    event?.main_image,
    event?.image_2,
    event?.image_3,
    event?.image_4,
  ].filter(Boolean); // Remove null/undefined values

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_URL}${imagePath}`;
  };

  const nextImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  const openLightbox = () => {
    if (allImages.length > 0) setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  return (
    <div className="font-[Arimo,sans-serif] bg-[#f8fafc] min-h-screen">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back link */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#2e6b4e] text-sm font-medium mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to events
        </Link>

        {/* Hero with overlay and date badge - click image to open full-size lightbox */}
        <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden mb-8 shadow-xl bg-gradient-to-br from-[#2e6b4e] to-[#1e3d32]">
          {allImages.length > 0 ? (
            <>
              <button
                type="button"
                onClick={openLightbox}
                className="absolute inset-0 w-full h-full block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2e6b4e]"
                aria-label="View full-size image"
              >
                <img
                  src={getImageUrl(allImages[currentImageIndex])}
                  alt={event.title}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
              {countdownLabel && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/95 backdrop-blur text-[#0f172b] text-sm font-semibold rounded-lg shadow pointer-events-none">
                  {countdownLabel}
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                <div className="text-white drop-shadow-md pointer-events-none">
                  <span className="text-sm font-medium opacity-90">{dateText}</span>
                  {timeText && <span className="text-sm opacity-90 ml-2">· {timeText}</span>}
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2" role="tablist" aria-label="Image index">
                    {allImages.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
                        className={`h-2 rounded-full transition-all z-10 ${
                          index === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                        }`}
                        aria-label={`Image ${index + 1}`}
                        aria-selected={index === currentImageIndex}
                      />
                    ))}
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur z-10"
                    aria-label="Previous image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur z-10"
                    aria-label="Next image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/90">
              <span className="text-4xl font-bold mb-2">{dateText}</span>
              <span className="text-lg opacity-80">Event Image</span>
            </div>
          )}
        </div>

        {/* Full-size image lightbox - click photo or use arrows */}
        {lightboxOpen && allImages.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Event image full size"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors z-20"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div
              className="relative w-full max-w-6xl max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getImageUrl(allImages[currentImageIndex])}
                alt={`${event.title} (${currentImageIndex + 1} of ${allImages.length})`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg select-none"
              />
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Previous image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Next image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm pointer-events-none">
                    {currentImageIndex + 1} / {allImages.length}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Title, category, price, tags */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0f172b] leading-tight mb-3">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex px-3 py-1.5 bg-[#2e6b4e]/12 text-[#2e6b4e] text-sm font-semibold rounded-lg">
                  {event.category}
                </span>
                <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg ${isFree ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-800"}`}>
                  {priceLabel}
                </span>
                {tagsList.length > 0 && tagsList.map((tag) => (
                  <span key={tag} className="inline-flex px-2.5 py-1 bg-[#f1f5f9] text-[#475569] text-xs font-medium rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleFavoriteClick}
              className="p-3 rounded-xl hover:bg-[#f1f5f9] transition-colors shrink-0"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill={isFavorited ? "#ef4444" : "none"} stroke={isFavorited ? "#ef4444" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Event info: date, location, share, calendar, RSVP */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-6">
          <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-5">Event info</h2>
          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            <div className="flex gap-4 p-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#2e6b4e]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e6b4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">Date & time</p>
                <p className="text-[#0f172b] font-semibold text-base">{dateText}</p>
                {timeText && <p className="text-[#475569] text-sm mt-1">{timeText}</p>}
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#2e6b4e]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e6b4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">Location</p>
                {(displayAddress.line1 || displayAddress.line2) ? (
                  <div className="text-[#0f172b] font-medium text-sm leading-relaxed space-y-0.5">
                    {displayAddress.line1 && <p className="font-semibold">{displayAddress.line1}</p>}
                    {displayAddress.line2 && <p className="text-[#475569]">{displayAddress.line2}</p>}
                  </div>
                ) : (
                  <p className="text-[#64748b] italic">—</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-[#475569] text-sm font-medium hover:bg-[#f8fafc] hover:border-[#2e6b4e]/40 hover:text-[#2e6b4e] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Add to calendar
            </a>
            <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-[#475569] text-sm font-medium hover:bg-[#f8fafc] hover:border-[#2e6b4e]/40 hover:text-[#2e6b4e] transition-colors">
              {linkCopied ? "Copied!" : <><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Share</>}
            </button>
          </div>
          {isAlmostFull && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
              Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left!
            </div>
          )}
          <div className="pt-6 border-t border-[#e2e8f0]">
            {event.capacity != null && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-[#475569] mb-2">
                  <span className="font-medium">Attending</span>
                  <span className="font-semibold text-[#0f172b]">{event.rsvp_count || 0} / {event.capacity}</span>
                </div>
                <div className="w-full h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2e6b4e] rounded-full transition-all duration-500" style={{ width: `${Math.min(((event.rsvp_count || 0) / event.capacity) * 100, 100)}%` }} />
                </div>
              </div>
            )}
            {event.capacity == null && event.rsvp_count > 0 && (
              <p className="text-sm text-[#475569] mb-4"><span className="font-semibold text-[#0f172b]">{event.rsvp_count}</span> attending</p>
            )}
            <button
              onClick={handleRSVP}
              disabled={rsvpLoading}
              className={`w-full px-6 py-4 rounded-xl font-semibold text-base transition-all shadow-sm ${isRsvped ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#2e6b4e] text-white hover:bg-[#255a43]"} ${rsvpLoading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {rsvpLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {isRsvped ? "Cancelling..." : "RSVPing..."}
                </span>
              ) : isRsvped ? "Cancel RSVP" : "RSVP"}
            </button>
          </div>
        </div>

        {/* About This Event Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0f172b] mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2e6b4e] rounded-full" />
            About this event
          </h2>
          <p className="text-[#475569] leading-relaxed whitespace-pre-line max-w-3xl">
            {event.description}
          </p>
        </div>

        {/* Organizer Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0f172b] mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2e6b4e] rounded-full" />
            Organizer
          </h2>
          {event?.organizer ? (
            <div className="flex items-center gap-5 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              {event.organizer?.profilePicture ? (
                <img 
                  src={String(event.organizer.profilePicture).startsWith("http") 
                    ? event.organizer.profilePicture 
                    : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${event.organizer.profilePicture}`}
                  alt={`${event.organizer?.firstName ?? ""} ${event.organizer?.lastName ?? ""}`}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-[#2e6b4e] flex items-center justify-center text-white text-xl font-bold shrink-0 ring-2 ring-white shadow">
                  {event.organizer?.firstName?.[0] || ""}{event.organizer?.lastName?.[0] || ""}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-[#0f172b]">
                  {event.organizer?.firstName} {event.organizer?.lastName}
                </p>
                {event.organizer?.showContactInfo && event.organizer?.email && (
                  <a 
                    href={`mailto:${event.organizer.email}`}
                    className="text-sm text-[#2e6b4e] hover:underline mt-1 block"
                  >
                    {event.organizer.email}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <img 
                src="/eventure-logo.png" 
                alt="Eventure" 
                className="h-12 w-auto shrink-0"
              />
              <div>
                <p className="text-sm text-[#45556c]">Organizer details coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Map/Location Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-[#0f172b] mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2e6b4e] rounded-full" />
            Location
          </h2>
          <EventMap
            address={event.address_line1}
            venue={event.venue}
            city={event.city}
            state={event.state}
            zipCode={event.zip_code}
            lat={event.lat}
            lng={event.lng}
          />
        </div>

        {/* Comments section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#0f172b] mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2e6b4e] rounded-full" />
            Comments
          </h2>
          <p className="text-sm text-[#64748b] mb-4">Leave a comment about this event. You must be signed in to post.</p>
          <div className="space-y-3 mb-5 max-h-72 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-[#f8fafc] border border-dashed border-[#e2e8f0]">
                <p className="text-[#64748b] text-sm">No comments yet. Be the first to leave one!</p>
              </div>
            ) : (
              comments.map((post) => (
                <div key={post.id} className="flex gap-3 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                  <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#2e6b4e] flex items-center justify-center text-white font-semibold text-xs">
                    {post.user?.profilePicture ? (
                      <img
                        src={post.user.profilePicture.startsWith("http") ? post.user.profilePicture : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${post.user.profilePicture}`}
                        alt={`${post.user?.firstName || ""} ${post.user?.lastName || ""}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{post.user?.firstName?.[0] || ""}{post.user?.lastName?.[0] || ""}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f172b]">
                      {post.user?.firstName} {post.user?.lastName}
                    </p>
                    <p className="text-sm text-[#45556c] whitespace-pre-wrap mt-0.5">{post.message}</p>
                    <p className="text-xs text-[#62748e] mt-1">
                      {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex gap-3">
            <input
              type="text"
              value={commentMessage}
              onChange={(e) => setCommentMessage(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 h-11 px-4 rounded-xl border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!commentMessage.trim() || commentSubmitting}
              className="px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl text-sm font-semibold hover:bg-[#255a43] disabled:opacity-50 transition-colors"
            >
              {commentSubmitting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default EventDetailsPage;
