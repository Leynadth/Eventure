import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import { getMyOrganizerSignup, submitOrganizerSignup } from "../../api";
import { useUserRole } from "../../contexts/AuthContext";

const inputBase =
  "w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-[#0f172b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent";

export default function OrganizerSignupPage() {
  const navigate = useNavigate();
  const role = useUserRole();
  const [formData, setFormData] = useState({
    organizationName: "",
    eventTypes: "",
    reason: "",
    additionalInfo: "",
  });
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [signup, setSignup] = useState(null);
  const [checkingSignup, setCheckingSignup] = useState(true);

  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  // Show form when: no signup; or rejected and 2+ weeks ago; or DB says approved but current role is user (demoted → can reapply).
  const canShowForm =
    !signup ||
    (signup.status === "rejected" && signup.reviewed_at && Date.now() - new Date(signup.reviewed_at).getTime() > TWO_WEEKS_MS) ||
    (signup.status === "approved" && role === "user");

  useEffect(() => {
    if (role === "organizer" || role === "admin") {
      navigate("/events/new", { replace: true });
      return;
    }
    const check = async () => {
      try {
        const res = await getMyOrganizerSignup();
        setSignup(res.signup || null);
      } catch {
        setSignup(null);
      } finally {
        setCheckingSignup(false);
      }
    };
    check();
  }, [role, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const reasonTrimmed = formData.reason.trim();
    if (reasonTrimmed.length < 20) {
      setError("Please provide a reason of at least 20 characters.");
      return;
    }
    if (!agreeGuidelines) {
      setError("Please agree to the organizer guidelines.");
      return;
    }
    setLoading(true);
    try {
      await submitOrganizerSignup({
        organizationName: formData.organizationName.trim() || null,
        eventTypes: formData.eventTypes.trim() || null,
        reason: reasonTrimmed,
        additionalInfo: formData.additionalInfo.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (role === "organizer" || role === "admin") {
    return null;
  }

  if (checkingSignup) {
    return (
      <AppShell>
        <div className="min-h-0 bg-[#f8fafc] font-[Arimo,sans-serif] flex items-center justify-center py-16">
          <p className="text-[#64748b]">Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (!canShowForm && signup) {
    const statusLabel = signup.status === "rejected" ? "Denied" : signup.status === "approved" ? "Approved" : "Pending";
    const statusColor = signup.status === "approved" ? "text-green-600" : signup.status === "rejected" ? "text-red-600" : "text-amber-600";
    return (
      <AppShell>
        <div className="min-h-0 bg-[#f8fafc] font-[Arimo,sans-serif]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#2e6b4e] to-[#255a43] px-6 py-8 sm:px-8 sm:py-10 text-white shadow-lg">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Organizer registration</h1>
              <p className="text-white/90 text-base">Your application status</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8">
              <p className="text-[#0f172b] font-medium mb-1">
                Status of Organizer Registration: <span className={statusColor}>{statusLabel}</span>
              </p>
              {signup.status === "rejected" && (
                <p className="text-sm text-[#64748b] mt-1">You may reapply in 2 weeks.</p>
              )}
              {signup.status === "pending" && (
                <p className="text-sm text-[#64748b] mt-1">We’ll review your request and get back to you within 1–3 days.</p>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  to="/my-events"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors"
                >
                  Back to My Events
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
                {signup.status === "approved" && (
                  <Link
                    to="/events/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#2e6b4e] text-[#2e6b4e] rounded-xl font-semibold hover:bg-[#2e6b4e]/10 transition-colors"
                  >
                    Create an event
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-0 bg-[#f8fafc] font-[Arimo,sans-serif]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Hero */}
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#2e6b4e] to-[#255a43] px-6 py-8 sm:px-8 sm:py-10 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Become an organizer</h1>
            </div>
            <p className="text-white/90 text-base sm:text-lg">
              Apply to host events on Eventure. We’ll review your request and get back to you within 1–3 days.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#2e6b4e]/10 text-[#2e6b4e] mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#0f172b] mb-2">Thank you for registering</h2>
              <p className="text-[#64748b] mb-6">
                You will receive a notification if you are accepted in 1–3 days.
              </p>
              <Link
                to="/my-events"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors"
              >
                Back to My Events
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-[#314158] mb-1.5">
                    Organization or group name (optional)
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g., Campus Events Board"
                    className={inputBase}
                    maxLength={255}
                  />
                </div>

                <div>
                  <label htmlFor="eventTypes" className="block text-sm font-medium text-[#314158] mb-1.5">
                    Types of events you plan to host (optional)
                  </label>
                  <input
                    type="text"
                    id="eventTypes"
                    name="eventTypes"
                    value={formData.eventTypes}
                    onChange={handleChange}
                    placeholder="e.g., Concerts, workshops, meetups"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-[#314158] mb-1.5">
                    Why do you want to host events on Eventure? *
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    minLength={20}
                    rows={4}
                    placeholder="Tell us about your goals and how you plan to use the platform (at least 20 characters)."
                    className={`${inputBase} resize-none`}
                  />
                  <p className="text-xs text-[#64748b] mt-1">{formData.reason.trim().length} characters (min 20)</p>
                </div>

                <div>
                  <label htmlFor="additionalInfo" className="block text-sm font-medium text-[#314158] mb-1.5">
                    Additional information (optional)
                  </label>
                  <textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Links, past events, or anything else that helps us review your application."
                    className={`${inputBase} resize-none`}
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeGuidelines}
                    onChange={(e) => {
                      setAgreeGuidelines(e.target.checked);
                      setError("");
                    }}
                    className="mt-1 w-4 h-4 rounded border-[#cbd5e1] text-[#2e6b4e] focus:ring-[#2e6b4e]"
                  />
                  <span className="text-sm text-[#475569]">
                    I agree to host events that are appropriate and comply with Eventure’s guidelines. I understand that approval is at the discretion of the Eventure team.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#2e6b4e] text-white font-semibold hover:bg-[#255a43] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting…" : "Submit application"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
