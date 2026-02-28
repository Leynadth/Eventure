import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { getHeroSettings, getContentSettings, getEvents, getCategories, getImageUrl } from "../../api";
import { useCurrentUser } from "../../contexts/AuthContext";
import EventCard from "../../components/events/EventCard";

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

const CAROUSEL_SLIDES = [
  { image: "/carousel-1.png", alt: "Discover events", title: "Discover", subtitle: "Find concerts, meetups, and more" },
  { image: "/carousel-2.png", alt: "Connect with others", title: "Connect", subtitle: "Meet people who share your interests" },
  { image: "/carousel-3.png", alt: "Show up", title: "Show up", subtitle: "RSVP in one click and go" },
];

const CAROUSEL_INTERVAL_MS = 5000;

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
  if (!address1) return String(event?.location ?? "").trim();
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

const TOP5_CAROUSEL_INTERVAL_MS = 6000;

function HomePage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [top5Events, setTop5Events] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [hero, setHero] = useState({ type: "color", color: "#2e6b4e", image: null });
  const [content, setContent] = useState({
    home_hero_headline: "",
    home_hero_subheadline: "",
    home_most_attended_title: "",
  });
  const [categories, setCategories] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselLoaded, setCarouselLoaded] = useState({});
  const [top5Index, setTop5Index] = useState(0);

  useEffect(() => {
    getHeroSettings().then(setHero).catch(() => {});
    getContentSettings().then(setContent).catch(() => {});
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchTop5Attended = async () => {
      try {
        setLoadingEvent(true);
        const events = await getEvents();
        if (events && events.length > 0) {
          const sorted = [...events].sort((a, b) => (b.rsvp_count || 0) - (a.rsvp_count || 0));
          setTop5Events(sorted.slice(0, 5));
        } else {
          setTop5Events([]);
        }
      } catch (err) {
        console.error("Failed to fetch top attended events:", err);
        setTop5Events([]);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchTop5Attended();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (top5Events.length <= 1) return;
    const t = setInterval(() => {
      setTop5Index((i) => (i + 1) % top5Events.length);
    }, TOP5_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [top5Events.length]);

  const handleCategoryClick = useCallback((category) => {
    navigate(`/browse?category=${encodeURIComponent(category)}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-[Arimo,sans-serif]">
      {/* Hero */}
      <section
        className="relative text-white overflow-hidden min-h-[280px] sm:min-h-[340px] md:min-h-[400px] lg:min-h-[460px] flex items-center"
        style={{
          ...(hero.type === "image" && hero.image
            ? {
                backgroundImage: `url(${getImageUrl(hero.image)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : {
                background: `linear-gradient(135deg, ${hero.color || "#2e6b4e"} 0%, #255a43 50%, #1e4a38 100%)`,
              }),
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/25" />
        <div className="absolute top-0 right-0 w-[40%] sm:w-[35%] h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[50%] bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full text-center">
          <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-3 sm:mb-4">
            Events near you, one click away
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 tracking-tight drop-shadow-sm">
            {content.home_hero_headline || "Discover Amazing Events Near You"}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
            {content.home_hero_subheadline || "Find and join concerts, meetups, workshops, and more—all in your area."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#2e6b4e] rounded-xl font-semibold text-base hover:bg-white/95 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              Browse events
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            {(user?.role === "organizer" || user?.role === "admin") ? (
              <Link
                to="/events/new"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 backdrop-blur border border-white/30 text-white rounded-xl font-semibold text-base hover:bg-white/25 hover:border-white/40 transition-all duration-200"
              >
                Create an event
              </Link>
            ) : (
              <Link
                to="/organizer-signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 backdrop-blur border border-white/30 text-white rounded-xl font-semibold text-base hover:bg-white/25 hover:border-white/40 transition-all duration-200"
              >
                Sign up to become an organizer
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-white border-b border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[#0f172b] mb-3">How it works</h2>
          <p className="text-center text-[#64748b] max-w-xl mx-auto mb-10 sm:mb-12">Three steps to your next great night out.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2e6b4e]/10 text-[#2e6b4e] mb-4 group-hover:bg-[#2e6b4e]/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0f172b] mb-2">Browse</h3>
              <p className="text-[#64748b] text-sm">Search by category, location, or date. Find what fits.</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2e6b4e]/10 text-[#2e6b4e] mb-4 group-hover:bg-[#2e6b4e]/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0f172b] mb-2">RSVP</h3>
              <p className="text-[#64748b] text-sm">One click to say you are going. No forms, no hassle.</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2e6b4e]/10 text-[#2e6b4e] mb-4 group-hover:bg-[#2e6b4e]/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="19" cy="7" r="2"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0f172b] mb-2">Show up</h3>
              <p className="text-[#64748b] text-sm">Get reminders and go. Connect with people who get it.</p>
            </div>
          </div>
          <p className="text-center mt-8 text-sm text-[#64748b]">
            <Link to="/about" className="text-[#2e6b4e] hover:text-[#255a43] hover:underline transition-colors">About Eventure</Link>
          </p>
        </div>
      </section>

      {/* Image carousel - Discover, Connect, Show up (carousel-1–3.png in client/public) */}
      <section className="py-10 sm:py-14 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[#0f172b] mb-2">What&apos;s happening</h2>
          <p className="text-center text-[#64748b] mb-8">A glimpse of what Eventure is all about.</p>
          <div className="relative rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-lg bg-white">
            <div className="aspect-[21/9] sm:aspect-[3/1] min-h-[200px] relative">
              {CAROUSEL_SLIDES.map((slide, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === carouselIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover"
                    onLoad={() => setCarouselLoaded((prev) => ({ ...prev, [i]: true }))}
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br from-[#2e6b4e] via-[#255a43] to-[#1e4a38] flex items-center justify-center ${carouselLoaded[i] ? "hidden" : ""}`} aria-hidden>
                    <div className="text-center text-white px-6">
                      <p className="text-2xl sm:text-3xl font-bold mb-1">{slide.title}</p>
                      <p className="text-white/80 text-sm sm:text-base">{slide.subtitle}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 text-white z-10">
                    <p className="text-lg sm:text-xl font-semibold drop-shadow-md">{slide.title}</p>
                    <p className="text-white/90 text-sm sm:text-base">{slide.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-6 flex gap-2 z-20">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setCarouselIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === carouselIndex ? "bg-white scale-125 shadow" : "bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Current Top 5 Most Attended Events - carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md border border-[#e2e8f0] p-8 md:p-10 ring-2 ring-[#2e6b4e]/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f172b]">
                {content.home_most_attended_title || "Current Top 5 Most Attended Events"}
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#2e6b4e]/10 text-[#2e6b4e] text-xs font-semibold uppercase tracking-wide">
                Popular
              </span>
            </div>
            {loadingEvent ? (
              <div className="text-center py-14 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[#64748b]">Loading events...</p>
              </div>
            ) : top5Events.length === 0 ? (
              <div className="text-center py-14 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[#64748b]">No events available yet</p>
                <Link to="/browse" className="inline-block mt-3 text-[#2e6b4e] font-medium hover:underline">Browse events</Link>
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-hidden">
                  {top5Events.map((event, i) => (
                    <div
                      key={event.id}
                      className={`transition-opacity duration-500 ease-in-out ${i === top5Index ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 z-0 pointer-events-none"}`}
                      aria-hidden={i !== top5Index}
                    >
                      <Link
                        to={`/events/${event.id}`}
                        className="block rounded-xl overflow-hidden border border-[#e2e8f0] hover:border-[#2e6b4e]/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:ring-offset-2"
                      >
                        <EventCard
                          title={event.title}
                          date={formatEventDate(event.starts_at)}
                          location={buildFullAddress(event)}
                          category={event.category}
                          imageUrl={getImageUrl(event.main_image)}
                          capacity={event.capacity}
                          rsvpCount={event.rsvp_count || 0}
                          price={event.ticket_price || 0}
                          eventId={event.id}
                        />
                      </Link>
                      {top5Events.length > 1 && (
                        <p className="text-center text-xs text-[#64748b] mt-3">
                          {i + 1} of {top5Events.length}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {top5Events.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      aria-label="Previous event"
                      onClick={() => setTop5Index((i) => (i - 1 + top5Events.length) % top5Events.length)}
                      className="p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172b] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    {top5Events.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Go to event ${i + 1}`}
                        onClick={() => setTop5Index(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${i === top5Index ? "bg-[#2e6b4e] scale-125" : "bg-[#cbd5e1] hover:bg-[#94a3b8]"}`}
                      />
                    ))}
                    <button
                      type="button"
                      aria-label="Next event"
                      onClick={() => setTop5Index((i) => (i + 1) % top5Events.length)}
                      className="p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172b] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-12 lg:py-16 bg-white border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172b] mb-2">Explore by interest</h2>
          <p className="text-[#64748b] mb-8 max-w-xl">Find events that match what you love.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 text-center hover:bg-[#2e6b4e]/5 hover:border-[#2e6b4e]/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
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
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[#2e6b4e]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_50%)]" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Stay in the loop
          </h2>
          <p className="text-white/90 mb-6">
            Get new events in your inbox. No spam—just what&apos;s happening near you.
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
