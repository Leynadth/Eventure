import { Component } from "react";
import { Link } from "react-router-dom";

/**
 * Catches render errors in children and shows a fallback instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      if (fallback) return fallback;
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 font-[Arimo,sans-serif]">
          <div className="max-w-md w-full rounded-2xl bg-white shadow-lg border border-[#e2e8f0] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#0f172b] mb-2">Something went wrong</h2>
            <p className="text-[#64748b] text-sm mb-6">
              This page couldn’t be loaded. Try going back to events.
            </p>
            <Link to="/browse" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e6b4e] text-white rounded-xl font-medium hover:bg-[#255a43] transition-colors">
              Browse events
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
