import { Link } from "react-router-dom";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172b] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/eventure-logo.png" alt="Eventure" className="h-11 w-auto" />
            </Link>
            <p className="text-[#94a3b8] text-sm leading-relaxed max-w-sm mb-4">
              Discover and join amazing events near you. Find, RSVP, and show up—all in one place.
            </p>
            <p className="text-[#64748b] text-xs">
              Made with care for event lovers everywhere.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Explore</h3>
            <ul className="space-y-3 text-sm text-[#94a3b8]">
              <li><Link to="/browse" className="hover:text-white transition-colors">Browse events</Link></li>
              <li><Link to="/browse" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link to="/create" className="hover:text-white transition-colors">Create event</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Account</h3>
            <ul className="space-y-3 text-sm text-[#94a3b8]">
              <li><Link to="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Sign up</Link></li>
              <li><Link to="/my-account" className="hover:text-white transition-colors">My account</Link></li>
              <li><Link to="/favorites" className="hover:text-white transition-colors">Favorites</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Legal</h3>
            <ul className="space-y-3 text-sm text-[#94a3b8]">
              <li><Link to="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#334155] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#64748b]">
          <p>&copy; {currentYear} Eventure. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/browse" className="hover:text-white transition-colors">Browse</Link>
            <Link to="/create" className="hover:text-white transition-colors">Create event</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
