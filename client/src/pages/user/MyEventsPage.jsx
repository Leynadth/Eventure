import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyEvents, getMyPastEvents, getAttendingEvents, getEventById, updateEvent, deleteEvent } from "../../api";
import AppShell from "../../components/layout/AppShell";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_URL}${imagePath}`;
}

// Format date from database (starts_at) to readable format
function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format time range
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

function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function nextWeekDefault() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  return toDatetimeLocal(d.toISOString());
}

function MyEventsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("hosting"); // "hosting" or "attending"
  const [hostingEvents, setHostingEvents] = useState([]);
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reactivateEventId, setReactivateEventId] = useState(null);
  const [reactivateEventData, setReactivateEventData] = useState(null);
  const [reactivateStart, setReactivateStart] = useState("");
  const [reactivateEnd, setReactivateEnd] = useState("");
  const [reactivateSubmitting, setReactivateSubmitting] = useState(false);
  const [reactivateError, setReactivateError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const [hosting, attending, past] = await Promise.all([
        getMyEvents(),
        getAttendingEvents(),
        getMyPastEvents(),
      ]);
      setHostingEvents(hosting || []);
      setAttendingEvents(attending || []);
      setPastEvents(past || []);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError(err.message || "Failed to load events");
      setHostingEvents([]);
      setAttendingEvents([]);
      setPastEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteEvent(eventId);
      // Remove from hosting events
      setHostingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert(err.message || "Failed to delete event");
    }
  };

  const handleView = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const handleAnalytics = (eventId) => {
    navigate(`/my-events/${eventId}/analytics`);
  };

  const handleEdit = (eventId) => {
    navigate(`/events/${eventId}/edit`);
  };

  const openReactivateModal = async (eventId) => {
    setReactivateError("");
    setReactivateStart(nextWeekDefault());
    setReactivateEnd("");
    setReactivateEventId(eventId);
    setReactivateEventData(null);
    try {
      const event = await getEventById(eventId);
      setReactivateEventData(event);
    } catch (err) {
      setReactivateError(err.message || "Could not load event");
    }
  };

  const closeReactivateModal = () => {
    setReactivateEventId(null);
    setReactivateEventData(null);
    setReactivateStart("");
    setReactivateEnd("");
    setReactivateError("");
  };

  const handleReactivateSubmit = async (e) => {
    e.preventDefault();
    if (!reactivateEventId || !reactivateEventData || !reactivateStart.trim()) return;
    const start = new Date(reactivateStart);
    if (isNaN(start.getTime())) {
      setReactivateError("Please enter a valid start date and time.");
      return;
    }
    let end = null;
    if (reactivateEnd.trim()) {
      end = new Date(reactivateEnd);
      if (isNaN(end.getTime()) || end < start) {
        setReactivateError("End date/time must be after start date/time.");
        return;
      }
    }
    setReactivateSubmitting(true);
    setReactivateError("");
    try {
      const payload = {
        title: reactivateEventData.title,
        description: reactivateEventData.description,
        category: reactivateEventData.category,
        starts_at: start.toISOString(),
        ends_at: end ? end.toISOString() : null,
        venue: reactivateEventData.venue ?? "",
        address_line1: reactivateEventData.address_line1 ?? "",
        address_line2: reactivateEventData.address_line2 ?? "",
        city: reactivateEventData.city ?? "",
        state: reactivateEventData.state ?? "",
        zip_code: reactivateEventData.zip_code ?? "",
        location: reactivateEventData.location ?? "",
        tags: reactivateEventData.tags ?? "",
        ticket_price: reactivateEventData.ticket_price ?? 0,
        capacity: reactivateEventData.capacity ?? null,
        main_image: reactivateEventData.main_image ?? null,
        image_2: reactivateEventData.image_2 ?? null,
        image_3: reactivateEventData.image_3 ?? null,
        image_4: reactivateEventData.image_4 ?? null,
        is_public: reactivateEventData.is_public !== false,
      };
      await updateEvent(reactivateEventId, payload);
      closeReactivateModal();
      await loadEvents();
    } catch (err) {
      setReactivateError(err.message || "Failed to reactivate event");
    } finally {
      setReactivateSubmitting(false);
    }
  };

  const currentEvents = activeTab === "hosting" ? hostingEvents : attendingEvents;
  const hostingCount = hostingEvents.length;
  const attendingCount = attendingEvents.length;

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0f172b] mb-2">My Events</h1>
              <p className="text-base text-[#45556c]">Manage your hosted events and RSVPs</p>
            </div>
            <Link
              to="/events/new"
              className="px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors whitespace-nowrap"
            >
              + Create Event
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-[#e2e8f0]">
            <button
              onClick={() => setActiveTab("hosting")}
              className={`pb-4 px-1 font-medium transition-colors ${
                activeTab === "hosting"
                  ? "text-[#2e6b4e] border-b-2 border-[#2e6b4e]"
                  : "text-[#45556c] hover:text-[#0f172b]"
              }`}
            >
              Hosting ({hostingCount})
            </button>
            <button
              onClick={() => setActiveTab("attending")}
              className={`pb-4 px-1 font-medium transition-colors ${
                activeTab === "attending"
                  ? "text-[#2e6b4e] border-b-2 border-[#2e6b4e]"
                  : "text-[#45556c] hover:text-[#0f172b]"
              }`}
            >
              Attending ({attendingCount})
            </button>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#45556c]">Loading events...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#62748e] mx-auto"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0f172b] mb-2">
              {activeTab === "hosting" ? "No events hosted yet" : "No events you're attending"}
            </h2>
            <p className="text-[#45556c] mb-6">
              {activeTab === "hosting"
                ? "Create your first event to get started!"
                : "RSVP to events to see them here."}
            </p>
            {activeTab === "hosting" && (
              <Link
                to="/events/new"
                className="inline-block px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors"
              >
                Create Event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {currentEvents.map((event) => {
              const dateText = formatEventDate(event.starts_at);
              const timeText = formatEventTimeRange(event.starts_at, event.ends_at);
              const addressText = buildFullAddress(event);
              const rsvpCount = parseInt(event.rsvp_count || 0, 10);
              const capacity = parseInt(event.capacity || 0, 10);
              const attendanceText = capacity > 0 ? `${rsvpCount} / ${capacity}` : `${rsvpCount}`;
              const progressPercent = capacity > 0 ? Math.min((rsvpCount / capacity) * 100, 100) : 0;

              return (
                <div
                  key={event.id}
                  className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image Section */}
                    <div className="w-full md:w-64 h-48 md:h-auto bg-gradient-to-br from-[#2e6b4e]/20 to-[#255a43]/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {event.main_image ? (
                        <img
                          src={getImageUrl(event.main_image)}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#2e6b4e]/50 text-sm">Event Image</span>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6 flex flex-col md:flex-row">
                      <div className="flex-1">
                        {/* Category Tag */}
                        {event.category && (
                          <span className="inline-block px-2 py-1 bg-[#2e6b4e]/10 text-[#2e6b4e] text-xs font-medium rounded mb-3">
                            {event.category}
                          </span>
                        )}

                        {/* Event Title */}
                        <h3 className="text-xl font-semibold text-[#0f172b] mb-3">{event.title}</h3>

                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-sm text-[#45556c] mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
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
                          <span>
                            {dateText}
                            {timeText && ` • ${timeText}`}
                          </span>
                        </div>

                        {/* Attendance */}
                        <div className="flex items-center gap-2 text-sm text-[#45556c] mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
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
                          <span>{attendanceText} attending</span>
                        </div>

                        {/* Location */}
                        {addressText && (
                          <div className="flex items-center gap-2 text-sm text-[#45556c] mb-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
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
                            <span>{addressText}</span>
                          </div>
                        )}

                        {/* RSVP Progress Bar */}
                        {capacity > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-[#45556c]">RSVPs</span>
                              <span className="text-xs text-[#45556c]">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2e6b4e] transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 md:ml-6 md:min-w-[120px] mt-4 md:mt-0">
                        {activeTab === "hosting" && (
                          <>
                            <button
                              onClick={() => handleView(event.id)}
                              className="px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleAnalytics(event.id)}
                              className="px-4 py-2 bg-white border border-[#2e6b4e] text-[#2e6b4e] rounded-lg text-sm font-medium hover:bg-[#2e6b4e]/10 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                              </svg>
                              Analytics
                            </button>
                            <button
                              onClick={() => handleEdit(event.id)}
                              className="px-4 py-2 bg-white border border-[#2e6b4e] text-[#2e6b4e] rounded-lg text-sm font-medium hover:bg-[#2e6b4e] hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="px-4 py-2 bg-white border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
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
                              Delete
                            </button>
                          </>
                        )}
                        {activeTab === "attending" && (
                          <button
                            onClick={() => handleView(event.id)}
                            className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
                          >
                            View Event
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Past Events (hosting only) */}
        {activeTab === "hosting" && !loading && pastEvents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-[#0f172b] mb-4">Past Events</h2>
            <p className="text-[#45556c] text-sm mb-6">Reactivate a past event by setting a new date and time.</p>
            <div className="space-y-4">
              {pastEvents.map((event) => {
                const dateText = formatEventDate(event.starts_at);
                const timeText = formatEventTimeRange(event.starts_at, event.ends_at);
                return (
                  <div
                    key={event.id}
                    className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      {event.category && (
                        <span className="inline-block px-2 py-0.5 bg-[#94a3b8]/20 text-[#64748b] text-xs font-medium rounded mb-2">
                          {event.category}
                        </span>
                      )}
                      <h3 className="font-semibold text-[#0f172b]">{event.title}</h3>
                      <p className="text-sm text-[#64748b] mt-1">
                        Was: {dateText}
                        {timeText && ` • ${timeText}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openReactivateModal(event.id)}
                      className="shrink-0 px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
                    >
                      Reactivate
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reactivate event modal */}
        {reactivateEventId != null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeReactivateModal}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-[#0f172b] mb-1">Reactivate event</h3>
              {reactivateEventData && (
                <p className="text-sm text-[#64748b] mb-4">{reactivateEventData.title}</p>
              )}
              {reactivateError && (
                <p className="text-sm text-red-600 mb-4" role="alert">{reactivateError}</p>
              )}
              <form onSubmit={handleReactivateSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#0f172b] mb-1">New start date & time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={reactivateStart}
                    onChange={(e) => setReactivateStart(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[#0f172b] focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#0f172b] mb-1">New end date & time (optional)</label>
                  <input
                    type="datetime-local"
                    value={reactivateEnd}
                    onChange={(e) => setReactivateEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[#0f172b] focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeReactivateModal}
                    className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f1f5f9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reactivateSubmitting || !reactivateStart.trim()}
                    className="px-4 py-2 rounded-lg bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43] disabled:opacity-50"
                  >
                    {reactivateSubmitting ? "Saving…" : "Reactivate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default MyEventsPage;
