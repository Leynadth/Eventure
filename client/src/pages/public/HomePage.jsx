import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getHeroSettings, getContentSettings, getEvents, getCategories, getImageUrl } from "../../api";
import EventCard from "../../components/events/EventCard";

// Fallback category icons (for any category name)
const DEFAULT_CATEGORY_ICON = "📅";
const CATEGORY_ICONS = {
  Music: "🎵",
  Food: "🍔",
  Tech: "💻",
  Sports: "⚽",
  Arts: "🎨",
  Business: "💼",
  Campus: "🏫",
  Concerts: "🎤",
  Networking: "🤝",
  Workshop: "🔧",
  Conference: "📊",
  Festival: "🎪",
  Other: "📅",
};


// Format date from database (starts_at) to readable format
function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

function HomePage() {
  const navigate = useNavigate();
  const [mostAttendedEvent, setMostAttendedEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [hero, setHero] = useState({ type: "color", color: "#2e6b4e", image: null });
  const [content, setContent] = useState({
    home_hero_headline: "",
    home_hero_subheadline: "",
    home_about_title: "",
    home_about_body: "",
    home_most_attended_title: "",
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getHeroSettings().then(setHero).catch(() => {});
    getContentSettings().then(setContent).catch(() => {});
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Fetch the most attended event
  useEffect(() => {
    const fetchMostAttendedEvent = async () => {
      try {
        setLoadingEvent(true);
        const events = await getEvents();
        if (events && events.length > 0) {
          const mostAttended = events.reduce((max, event) => {
            const currentCount = event.rsvp_count || 0;
            const maxCount = max.rsvp_count || 0;
            return currentCount > maxCount ? event : max;
          }, events[0]);
          setMostAttendedEvent(mostAttended);
        }
      } catch (err) {
        console.error("Failed to fetch most attended event:", err);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchMostAttendedEvent();
  }, []);


  const handleCategoryClick = (category) => {
    navigate(`/browse?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-[Arimo,sans-serif]">
      {/* Hero Section - from admin settings + editable content */}
      <section
        className="relative text-white overflow-hidden"
        style={{
          minHeight: "420px",
          ...(hero.type === "image" && hero.image
            ? {
                backgroundImage: `url(${getImageUrl(hero.image)})`,
                backgroundSize: "cover",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
              }
            : { backgroundColor: hero.color || "#2e6b4e" }),
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-[#1e3d32]/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-36">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight drop-shadow-sm">
              {content.home_hero_headline || "Discover Amazing Events Near You"}
            </h1>
            <p className="text-lg md:text-xl text-white/95 max-w-2xl mx-auto leading-relaxed">
              {content.home_hero_subheadline || "Find and join exciting events happening in your area"}
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-white text-[#2e6b4e] rounded-xl font-semibold text-base hover:bg-white/95 hover:shadow-lg transition-all shadow-md"
            >
              Browse events
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Explore — compact CTA strip */}
      <section className="py-6 border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/browse"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172b] font-semibold shadow-sm hover:border-[#2e6b4e]/50 hover:bg-[#2e6b4e]/5 transition-all text-sm font-semibold text-[#0f172b]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#2e6b4e] shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Browse events
            </Link>
            <Link
              to="/events/new"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#2e6b4e] text-white font-semibold text-sm hover:bg-[#255a43] transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M12 5v14M5 12h14"/></svg>
              Create an event
            </Link>
          </div>
          <p className="text-center text-[#94a3b8] text-xs mt-4">Search and filter on the browse page when you’re ready.</p>
        </div>
      </section>

      {/* Our Story Section with Most Attended Event */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Story card: image on top, then title + text */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            {(content.home_founders_image && getImageUrl(content.home_founders_image)) ? (
              <div className="aspect-[4/3] sm:aspect-[5/3] bg-[#f8fafc] flex items-center justify-center p-4">
                <img
                  src={getImageUrl(content.home_founders_image)}
                  alt="Joel Mayorga and Leynadth Sosa Ortiz, who built Eventure"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            ) : null}
            <div className="p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0f172b] mb-4">
                {content.home_about_title || "How Eventure Started"}
              </h2>
              <div className="text-[#475569] leading-relaxed space-y-3 text-sm sm:text-base">
                    {content.home_about_body ? (
                      <div className="whitespace-pre-line">{content.home_about_body}</div>
                    ) : (
                      <>
                        <p>
                          Eventure was built by <strong className="text-[#0f172b]">Joel Mayorga</strong> and <strong className="text-[#0f172b]">Leynadth Sosa Ortiz</strong> as our senior project at New England Institute of Technology. We wanted a place where finding events—concerts, meetups, workshops, whatever—didn’t feel like a chore. So we made one.
                        </p>
                        <p>
                          We’re both battling depression, but we’re still doing our best to succeed and build something that helps people connect. Eventure is about keeping it simple: browse, RSVP, and show up. No clutter, no hassle—just events that matter to you.
                        </p>
                        <p>
                          Our goal is simple: <strong className="text-[#2e6b4e]">make event discovery easy and help people connect.</strong> Thanks for being here—we hope you find something great.
                        </p>
                      </>
                    )}
              </div>
              <p className="mt-4 text-sm text-[#64748b] font-medium">Built with you in mind</p>
            </div>
          </div>

          {/* Most Attended Event Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f172b]">
                {content.home_most_attended_title || "Current Most Attended Event"}
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#2e6b4e]/10 text-[#2e6b4e] text-xs font-semibold uppercase tracking-wide">
                Popular
              </span>
            </div>
            {loadingEvent ? (
              <div className="text-center py-14 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[#64748b]">Loading event...</p>
              </div>
            ) : mostAttendedEvent ? (
              <Link
                to={`/events/${mostAttendedEvent.id}`}
                className="block rounded-xl overflow-hidden border border-[#e2e8f0] hover:border-[#2e6b4e]/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:ring-offset-2"
              >
                <EventCard
                  title={mostAttendedEvent.title}
                  date={formatEventDate(mostAttendedEvent.starts_at)}
                  location={buildFullAddress(mostAttendedEvent)}
                  category={mostAttendedEvent.category}
                  imageUrl={getImageUrl(mostAttendedEvent.main_image)}
                  capacity={mostAttendedEvent.capacity}
                  rsvpCount={mostAttendedEvent.rsvp_count || 0}
                  price={mostAttendedEvent.ticket_price || 0}
                  eventId={mostAttendedEvent.id}
                />
              </Link>
            ) : (
              <div className="text-center py-14 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[#64748b]">No events available yet</p>
                <Link to="/browse" className="inline-block mt-3 text-[#2e6b4e] font-medium hover:underline">Browse events</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-10 lg:py-12 bg-white border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#0f172b] mb-2">Browse by Category</h2>
          <p className="text-[#64748b] mb-6 max-w-xl">Find events that match what you love.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 text-center hover:bg-[#2e6b4e]/5 hover:border-[#2e6b4e]/30 hover:shadow-sm transition-all group"
              >
                <span className="block text-3xl mb-3">{CATEGORY_ICONS[category] || "📅"}</span>
                <p className="text-sm font-semibold text-[#0f172b] group-hover:text-[#2e6b4e] transition-colors">
                  {category}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Subscribe */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[#2e6b4e]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_50%)]" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Stay in the loop
          </h2>
          <p className="text-white/90 mb-6">
            Get new events in your inbox. No spam—just what's happening near you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 h-12 px-4 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-colors"
            />
            <button className="h-12 px-6 bg-white text-[#2e6b4e] rounded-xl font-semibold hover:bg-white/95 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
