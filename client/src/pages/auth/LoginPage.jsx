import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login } from "../../api";
import { useAuth } from "../../contexts/AuthContext";

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

function LoginPage() {
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const registered = location.state?.registered === true;
  const resetSuccess = location.state?.resetSuccess === true;
  const returnTo = location.state?.returnTo || "/dashboard";

  useEffect(() => {
    const token = localStorage.getItem("eventure_token");
    if (token && user) {
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }
      if (user.role === "user") {
        navigate("/my-events", { replace: true });
        return;
      }
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      if (data.token) localStorage.setItem("eventure_token", data.token);
      if (data.user) setUser(data.user);
      if (data.user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (data.user?.role === "user") {
        navigate("/my-events", { replace: true });
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-4 pr-12 text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e]/50 focus:border-[#2e6b4e] transition-shadow";

  return (
    <div className="min-h-[100dvh] sm:min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-white to-[#ecfdf5] p-4 sm:p-6 py-8 font-[Arimo,sans-serif]">
      <div className="w-full max-w-[420px] min-w-0">
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
            <h1 className="text-2xl font-semibold text-[#0f172a] mt-2">Welcome back</h1>
            <p className="text-[#64748b] text-sm">Sign in to your account to continue</p>
          </div>

          {(registered || resetSuccess) && (
            <div
              className="flex items-center gap-2 rounded-xl bg-[#ecfdf5] text-[#047857] px-4 py-3 text-sm border border-[#a7f3d0]"
              role="status"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {resetSuccess ? "Password updated. Sign in to continue." : "Account created. Sign in to continue."}
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-[#334155]">
                Email
              </label>
              <input
                type="email"
                id="login-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputBase}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-[#334155]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className={inputBase}
                />
                <EyeIcon show={showPassword} onClick={() => setShowPassword((s) => !s)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  autoComplete="off"
                  className="w-4 h-4 rounded border-[#cbd5e1] text-[#2e6b4e] focus:ring-[#2e6b4e]"
                />
                <span className="text-sm text-[#475569]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-[#2e6b4e] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#2e6b4e] text-white font-semibold hover:bg-[#25634d] active:bg-[#1e5239] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#2e6b4e]/20"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748b]">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-[#2e6b4e] hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
