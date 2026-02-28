import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyEvents, getMyPastEvents, getAttendingEvents, getEventById, updateEvent, deleteEvent, getEventAnnouncements, sendEventAnnouncement, deleteEventAnnouncement } from "../../api";
import AppShell from "../../components/layout/AppShell";
import { useUserRole } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";

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
  const role = useUserRole();
  const { toast, confirm } = useNotification();
  const isOrganizer = role === "organizer" || role === "admin";
  const [activeTab, setActiveTab] = useState("hosting");
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
  const [announcementModal, setAnnouncementModal] = useState({ open: false, eventId: null, eventTitle: null });
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementSending, setAnnouncementSending] = useState(false);

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

  useEffect(() => {
    if (!isOrganizer) setActiveTab("attending");
  }, [isOrganizer]);

  const handleDelete = async (eventId) => {
    const ok = await confirm({ title: "Delete event", message: "Are you sure you want to delete this event? This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", variant: "danger" });
    if (!ok) return;
    try {
      await deleteEvent(eventId);
      setHostingEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast("Event deleted successfully.", "success");
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast(err.message || "Failed to delete event", "error");
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

  const openAnnouncementModal = async (eventId, eventTitle) => {
    setAnnouncementModal({ open: true, eventId, eventTitle });
    setAnnouncementMessage("");
    setAnnouncements([]);
    setAnnouncementsLoading(true);
    try {
      const list = await getEventAnnouncements(eventId);
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const closeAnnouncementModal = () => {
    setAnnouncementModal({ open: false, eventId: null, eventTitle: null });
    setAnnouncementMessage("");
    setAnnouncements([]);
  };

  const handleSendAnnouncement = async () => {
    const msg = announcementMessage.trim();
    if (!msg || !announcementModal.eventId) return;
    setAnnouncementSending(true);
    try {
      await sendEventAnnouncement(announcementModal.eventId, msg);
      toast("Announcement sent to attendees and added to the event wall.", "success");
      setAnnouncementMessage("");
      const list = await getEventAnnouncements(announcementModal.eventId);
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      toast(err.message || "Failed to send announcement", "error");
    } finally {
      setAnnouncementSending(false);
    }
  };

  const handleRemoveAnnouncement = async (announcementId) => {
    if (!announcementModal.eventId) return;
    try {
      await deleteEventAnnouncement(announcementModal.eventId, announcementId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
      toast("Announcement removed from event wall.", "success");
    } catch (err) {
      toast(err.message || "Failed to remove announcement", "error");
    }
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

  const currentEvents = isOrganizer
    ? activeTab === "hosting"
      ? hostingEvents
      : attendingEvents
    : attendingEvents;
  const hostingCount = hostingEvents.length;
  const attendingCount = attendingEvents.length;

  return (
    <AppShell>
      <div className="min-h-0 bg-[#f8fafc] font-[Arimo,sans-serif]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Hero: home-style for users, organizer-style for organizers */}
          {isOrganizer ? (
            <div className="mb-8 sm:mb-10 rounded-2xl bg-gradient-to-br from-[#2e6b4e] to-[#255a43] px-6 py-8 sm:px-8 sm:py-10 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur">
                      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Events</h1>
                  </div>
                  <p className="text-white/90 text-base sm:text-lg max-w-xl">Manage your hosted events and RSVPs.</p>
                </div>
                <Link
                  to="/events/new"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2e6b4e] rounded-xl font-semibold hover:bg-white/95 transition-colors shadow-sm shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Create Event
                </Link>
              </div>
            </div>
          ) : (
            <section className="relative text-white overflow-hidden rounded-2xl min-h-[200px] sm:min-h-[240px] flex items-center justify-center mb-8 sm:mb-10 shadow-lg" style={{ background: "linear-gradient(135deg, #2e6b4e 0%, #255a43 50%, #1e4a38 100%)" }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15" />
              <div className="relative max-w-3xl mx-auto px-6 py-10 sm:py-12 text-center">
                <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-2">Your events</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight">My Events</h1>
                <p className="text-white/90 text-base sm:text-lg mb-6">Events you&apos;re attending and ways to get more involved.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2e6b4e] rounded-xl font-semibold hover:bg-white/95 transition-colors shadow-sm"
                  >
                    Browse events
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                  <Link
                    to="/organizer-signup"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur border border-white/30 text-white rounded-xl font-semibold hover:bg-white/25 hover:border-white/40 transition-colors"
                  >
                    Sign up as an organizer to create events
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Tabs: only Attending for users; Hosting + Attending for organizers */}
          <div className="flex items-center gap-6 sm:gap-8 border-b border-[#e2e8f0] mb-6 sm:mb-8 overflow-x-auto">
            {isOrganizer && (
              <button
                onClick={() => setActiveTab("hosting")}
                className={`pb-4 px-1 font-medium transition-colors whitespace-nowrap ${
                  activeTab === "hosting" ? "text-[#2e6b4e] border-b-2 border-[#2e6b4e]" : "text-[#45556c] hover:text-[#0f172b]"
                }`}
              >
                Hosting ({hostingCount})
              </button>
            )}
            <button
              onClick={() => setActiveTab("attending")}
              className={`pb-4 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "attending" ? "text-[#2e6b4e] border-b-2 border-[#2e6b4e]" : "text-[#45556c] hover:text-[#0f172b]"
              }`}
            >
              Attending ({attendingCount})
            </button>
          </div>

        {/* Events List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-2 border-[#2e6b4e] border-t-transparent animate-spin mb-4" />
            <p className="text-[#64748b] font-medium">Loading events...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
          </div>
        ) : currentEvents.length === 0 ? (
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#0f172b] mb-2">
              {activeTab === "hosting" ? "No events hosted yet" : "No events you're attending"}
            </h2>
            <p className="text-[#64748b] max-w-sm mx-auto mb-8">
              {activeTab === "hosting"
                ? "Create your first event to get started!"
                : "RSVP to events from Browse or event pages to see them here."}
            </p>
            {activeTab === "hosting" && (
              <Link
                to="/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Create Event
              </Link>
            )}
            {activeTab === "attending" && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/browse"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors shadow-sm"
                >
                  Browse events
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
                {!isOrganizer && (
                  <Link
                    to="/organizer-signup"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#2e6b4e] text-[#2e6b4e] rounded-xl font-semibold hover:bg-[#2e6b4e]/10 transition-colors"
                  >
                    Sign up as an organizer to create events
                  </Link>
                )}
              </div>
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
                              onClick={() => openAnnouncementModal(event.id, event.title)}
                              className="px-4 py-2 bg-white border border-[#2e6b4e] text-[#2e6b4e] rounded-lg text-sm font-medium hover:bg-[#2e6b4e]/10 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              Send out announcement
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
          <div className="mt-12 pt-8 border-t border-[#e2e8f0]">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#0f172b] mb-2">Past Events</h2>
            <p className="text-[#64748b] text-sm mb-6">Reactivate a past event by setting a new date and time.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastEvents.map((event) => {
                const dateText = formatEventDate(event.starts_at);
                const timeText = formatEventTimeRange(event.starts_at, event.ends_at);
                return (
                  <div
                    key={event.id}
                    className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
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
                      className="shrink-0 px-4 py-2.5 bg-[#2e6b4e] text-white rounded-xl text-sm font-medium hover:bg-[#255a43] transition-colors"
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

        {/* Send out announcement modal */}
        {announcementModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeAnnouncementModal}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[#e2e8f0]">
                <h3 className="text-lg font-semibold text-[#0f172b]">Send out announcement</h3>
                {announcementModal.eventTitle && <p className="text-sm text-[#64748b] mt-0.5">{announcementModal.eventTitle}</p>}
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <label className="block text-sm font-medium text-[#0f172b] mb-2">New announcement</label>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Type your announcement… It will be sent to attendees' notifications and shown on the event page."
                  rows={4}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[#0f172b] focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={handleSendAnnouncement}
                    disabled={!announcementMessage.trim() || announcementSending}
                    className="px-4 py-2 rounded-lg bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43] disabled:opacity-50"
                  >
                    {announcementSending ? "Sending…" : "Send"}
                  </button>
                </div>
                <div className="mt-6 pt-6 border-t border-[#e2e8f0]">
                  <h4 className="text-sm font-semibold text-[#0f172b] mb-2">Announcements on event page</h4>
                  <p className="text-xs text-[#64748b] mb-3">Remove an announcement to hide it from the event details wall.</p>
                  {announcementsLoading ? (
                    <p className="text-sm text-[#64748b]">Loading…</p>
                  ) : announcements.length === 0 ? (
                    <p className="text-sm text-[#64748b]">No announcements yet.</p>
                  ) : (
                    <ul className="space-y-3 max-h-48 overflow-y-auto">
                      {announcements.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#0f172b] whitespace-pre-wrap">{a.message}</p>
                            <p className="text-xs text-[#64748b] mt-1">{a.authorName} · {formatEventDate(a.createdAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAnnouncement(a.id)}
                            className="shrink-0 p-1.5 text-[#64748b] hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove from event wall"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-[#e2e8f0] flex justify-end">
                <button type="button" onClick={closeAnnouncementModal} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f1f5f9]">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}

export default MyEventsPage;
