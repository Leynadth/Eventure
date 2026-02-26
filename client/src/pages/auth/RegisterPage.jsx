import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../api";

const ROLE_OPTIONS = [
  { value: "user", label: "Join as attendee" },
  { value: "organizer", label: "Create & manage events" },
];

function EyeIcon({ show, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:ring-offset-0 rounded p-0.5"
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    password: "",
    confirmPassword: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });
      navigate("/login", { state: { registered: true }, replace: true });
    } catch (err) {
      const msg = err.message || "Registration failed. Please try again.";
      setError(msg === "Email already in use" ? "Email already in use." : msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-4 pr-12 text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e]/50 focus:border-[#2e6b4e] transition-shadow";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-white to-[#ecfdf5] p-4 sm:p-6 font-[Arimo,sans-serif] py-10">
      <div className="w-full max-w-[480px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2e6b4e] transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to home
        </Link>

        <div className="bg-white/90 backdrop-blur-sm border border-[#e2e8f0] rounded-2xl shadow-xl shadow-[#0f172a]/5 p-8 sm:p-10 flex flex-col gap-6 border-t-4 border-t-[#2e6b4e]">
          <div className="flex flex-col items-center gap-2">
            <Link to="/" className="focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] rounded-lg">
              <img src="/eventure-logo.png" alt="Eventure" className="h-12 w-auto" />
            </Link>
            <h1 className="text-2xl font-semibold text-[#0f172a] mt-2">Create your account</h1>
            <p className="text-[#64748b] text-sm text-center">Join to discover events, RSVP, and create your own</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[#fef2f2] text-[#b91c1c] px-4 py-3 text-sm border border-[#fecaca]" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-sm font-medium text-[#334155]">
                  First name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="First name"
                  className={inputBase.replace("pr-12", "pr-4")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-sm font-medium text-[#334155]">
                  Last name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Last name"
                  className={inputBase.replace("pr-12", "pr-4")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium text-[#334155]">
                Email
              </label>
              <input
                type="email"
                id="reg-email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className={inputBase.replace("pr-12", "pr-4")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-medium text-[#334155]">
                I want to
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`${inputBase.replace("pr-12", "pr-10")} appearance-none bg-white cursor-pointer`}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#334155]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className={inputBase}
                />
                <EyeIcon show={showPassword} onClick={() => setShowPassword((s) => !s)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-[#334155]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="Confirm your password"
                  className={inputBase}
                />
                <EyeIcon show={showConfirmPassword} onClick={() => setShowConfirmPassword((s) => !s)} />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  setError("");
                }}
                className="mt-1 w-4 h-4 rounded border-[#cbd5e1] text-[#2e6b4e] focus:ring-[#2e6b4e]"
              />
              <span className="text-sm text-[#475569]">
                I agree to the{" "}
                <Link to="#" className="text-[#2e6b4e] hover:underline font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="#" className="text-[#2e6b4e] hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#2e6b4e] text-white font-semibold hover:bg-[#25634d] active:bg-[#1e5239] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#2e6b4e]/20"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748b]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2e6b4e] hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
