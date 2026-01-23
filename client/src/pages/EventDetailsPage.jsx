import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEventById } from "../api";

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

function EventDetailsPage() {
  const { id } = useParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEventById(id);
        setEvent(data);
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

  const handleFavoriteClick = () => {
    setIsFavorited(!isFavorited);
  };

  const handleRSVP = () => {
    // RSVP functionality will be implemented later
    console.log("RSVP clicked");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8 text-center">
          <p className="text-[#45556c]">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-[#0f172b] mb-4">Event not found</h1>
          {error ? (
            <p className="text-[#45556c] mb-6">{error}</p>
          ) : (
            <p className="text-[#45556c] mb-6">
              The event you're looking for doesn't exist or has been removed.
            </p>
          )}
        </div>
      </div>
    );
  }

  const addressText = buildFullAddress(event);
  const dateText = formatEventDate(event.starts_at);
  const timeText = formatEventTimeRange(event.starts_at, event.ends_at);

  return (
    <div className="font-[Arimo,sans-serif]">
      {/* Main Content */}
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero/Banner Area */}
        <div className="relative w-full h-80 rounded-[14px] overflow-hidden mb-6 bg-gradient-to-br from-[#2e6b4e] to-[#255a43] flex items-center justify-center">
          <span className="text-white/70 text-lg">Event Image</span>
        </div>

        {/* Title and Category */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#0f172b] mb-3">{event.title}</h1>
              <span className="inline-block px-3 py-1 bg-[#2e6b4e]/10 text-[#2e6b4e] text-sm font-medium rounded-full">
                {event.category}
              </span>
            </div>
            <button
              onClick={handleFavoriteClick}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isFavorited ? "#ef4444" : "none"}
                stroke={isFavorited ? "#ef4444" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#45556c]"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Date/Time Row */}
          <div className="flex items-center gap-2 text-[#45556c] mb-3">
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
            <span className="font-medium">{dateText}</span>
            {timeText ? <span className="text-[#62748e]">•</span> : null}
            {timeText ? <span>{timeText}</span> : null}
          </div>

          {/* Location Row */}
          <div className="flex items-center gap-2 text-[#45556c] mb-3">
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="font-medium">{addressText}</span>
          </div>

          {/* Action Area: RSVP Button */}
          <div className="pt-4 border-t border-[#e2e8f0]">
            <button
              onClick={handleRSVP}
              className="w-full px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors text-base"
            >
              RSVP
            </button>
          </div>
        </div>

        {/* About This Event Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0f172b] mb-4">About this event</h2>
          <p className="text-[#45556c] leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>

        {/* Organizer Info Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0f172b] mb-4">Organizer</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2e6b4e] flex items-center justify-center text-white font-bold text-lg shrink-0">
              E
            </div>
            <div>
              <p className="font-medium text-[#0f172b]">Eventure</p>
              <p className="text-sm text-[#45556c]">Organizer details coming soon</p>
            </div>
          </div>
        </div>

        {/* Map/Location Placeholder Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] shadow-sm p-6">
          <h2 className="text-xl font-semibold text-[#0f172b] mb-4">Location</h2>
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-[#cad5e2]">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#62748e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-sm text-[#45556c]">{addressText}</p>
              <p className="text-xs text-[#62748e] mt-1">Map view coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsPage;
