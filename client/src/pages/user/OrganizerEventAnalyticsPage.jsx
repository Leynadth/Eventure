import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrganizerEventAnalytics } from "../../api";
import AppShell from "../../components/layout/AppShell";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format datetime in Eastern Time for "Signed up" column. */
function formatDateTimeEastern(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildAddress(e) {
  const parts = [e?.venue, e?.address_line1, e?.address_line2].filter(Boolean);
  const cityStateZip = [e?.city, e?.state].filter(Boolean).join(", ") + (e?.zip_code ? ` ${e.zip_code}` : "");
  if (cityStateZip.trim()) parts.push(cityStateZip.trim());
  return parts.length ? parts.join(", ") : (e?.location || "—");
}

export default function OrganizerEventAnalyticsPage() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await getOrganizerEventAnalytics(eventId);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load analytics");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#2e6b4e]/30 border-t-[#2e6b4e] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#64748b] font-medium">Loading event analytics...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 max-w-md text-center">
            <p className="text-red-600 font-medium mb-2">{error || "Event not found"}</p>
            <p className="text-[#64748b] text-sm mb-4">You may not be the organizer for this event, or it may have been removed.</p>
            <Link to="/my-events" className="inline-block px-4 py-2 rounded-xl bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43]">
              Back to My Events
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { event, attendees, attending_count } = data;
  const capacity = event.capacity != null && event.capacity !== "" ? Number(event.capacity) : null;
  const fillPercent = capacity && capacity > 0 ? Math.min(Math.round((attending_count / capacity) * 100), 100) : null;

  return (
    <AppShell>
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb / back */}
          <div className="mb-6">
            <Link
              to="/my-events"
              className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#2e6b4e] font-medium text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              My Events
            </Link>
          </div>

          {/* Event summary card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden mb-8">
            <div className="p-6 border-b border-[#e2e8f0]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {event.category && (
                    <span className="inline-block px-2 py-1 bg-[#2e6b4e]/10 text-[#2e6b4e] text-xs font-medium rounded mb-2">
                      {event.category}
                    </span>
                  )}
                  <h1 className="text-2xl font-bold text-[#0f172b]">{event.title}</h1>
                  <p className="text-[#64748b] mt-1">{formatDate(event.starts_at)}</p>
                  {(event.starts_at || event.ends_at) && (
                    <p className="text-sm text-[#64748b]">
                      {formatTime(event.starts_at)}
                      {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to={`/events/${event.id}`}
                    className="px-4 py-2 rounded-xl border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f8fafc]"
                  >
                    View event
                  </Link>
                  <Link
                    to={`/events/${event.id}/edit`}
                    className="px-4 py-2 rounded-xl bg-[#2e6b4e] text-white font-medium hover:bg-[#255a43]"
                  >
                    Edit event
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-[#f8fafc]/60 border-b border-[#e2e8f0]">
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Attending</p>
                <p className="text-2xl font-bold text-[#0f172b]">{attending_count}</p>
              </div>
              {capacity != null && (
                <div>
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Capacity</p>
                  <p className="text-2xl font-bold text-[#0f172b]">{capacity}</p>
                </div>
              )}
              {fillPercent != null && (
                <div>
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Fill rate</p>
                  <p className="text-2xl font-bold text-[#2e6b4e]">{fillPercent}%</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Event status</p>
                <p className="text-lg font-semibold capitalize text-[#0f172b]">{event.status}</p>
              </div>
            </div>

            {event.venue || event.address_line1 || event.location ? (
              <div className="px-6 py-3 border-b border-[#e2e8f0]">
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-1">Location</p>
                <p className="text-[#0f172b]">{buildAddress(event)}</p>
              </div>
            ) : null}

            {event.ticket_price != null && Number(event.ticket_price) > 0 && (
              <div className="px-6 py-3">
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-1">Ticket price</p>
                <p className="text-[#0f172b]">${Number(event.ticket_price).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Attendees table */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172b]">Attendees</h2>
              <span className="text-sm text-[#64748b]">{attendees.length} signed up</span>
            </div>
            {attendees.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#64748b]">
                <p className="font-medium">No attendees yet</p>
                <p className="text-sm mt-1">When people RSVP &quot;Going&quot;, they&apos;ll appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]/60">
                      <th className="px-6 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">#</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Email</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Signed up (Eastern)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((a, i) => (
                      <tr key={a.rsvp_id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]/50">
                        <td className="px-6 py-4 text-[#64748b] text-sm">{i + 1}</td>
                        <td className="px-6 py-4 font-medium text-[#0f172b]">
                          {[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-6 py-4 text-[#475569] text-sm">{a.email || "—"}</td>
                        <td className="px-6 py-4 text-[#64748b] text-sm">{formatDateTimeEastern(a.signed_up_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
