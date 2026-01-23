import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EventCard from "../components/events/EventCard";

// Placeholder events data (shared structure with EventDetailsPage)
export const PLACEHOLDER_EVENTS = [
  {
    id: 1,
    title: "Summer Music Festival 2024",
    date: "June 15, 2024",
    location: "Central Park, New York",
    category: "Music",
    description: "Join us for an amazing summer music festival featuring top artists from around the world.",
  },
  {
    id: 2,
    title: "Tech Innovation Summit",
    date: "July 20, 2024",
    location: "San Francisco Convention Center",
    category: "Tech",
    description: "Explore the latest in technology and innovation with industry leaders and startups.",
  },
  {
    id: 3,
    title: "Food & Wine Expo",
    date: "August 10, 2024",
    location: "Chicago Navy Pier",
    category: "Food",
    description: "Taste exquisite cuisine and fine wines from renowned chefs and wineries.",
  },
  {
    id: 4,
    title: "Jazz Night Under the Stars",
    date: "June 22, 2024",
    location: "Riverside Park, New York",
    category: "Music",
    description: "Enjoy an evening of smooth jazz performances in a beautiful outdoor setting.",
  },
  {
    id: 5,
    title: "Startup Pitch Competition",
    date: "July 5, 2024",
    location: "Silicon Valley Hub, San Jose",
    category: "Tech",
    description: "Watch innovative startups pitch their ideas to investors and win prizes.",
  },
  {
    id: 6,
    title: "Farmers Market & Food Trucks",
    date: "August 3, 2024",
    location: "Downtown Plaza, Seattle",
    category: "Food",
    description: "Fresh produce, local vendors, and delicious food trucks all in one place.",
  },
  {
    id: 7,
    title: "Rock Concert Series",
    date: "June 30, 2024",
    location: "Madison Square Garden, New York",
    category: "Music",
    description: "Experience electrifying rock performances from legendary bands.",
  },
  {
    id: 8,
    title: "AI & Machine Learning Workshop",
    date: "July 15, 2024",
    location: "Tech Campus, Boston",
    category: "Tech",
    description: "Hands-on workshop covering the fundamentals of AI and machine learning.",
  },
];

const CATEGORIES = ["All", "Music", "Food", "Tech"];

function EventsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredEvents = useMemo(() => {
    return PLACEHOLDER_EVENTS.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-[#0f172b]">Events</h1>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search events by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-[#cad5e2] text-base placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-[#cad5e2] text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="text-left focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:rounded-2xl"
              >
                <EventCard
                  title={event.title}
                  date={event.date}
                  location={event.location}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-12 text-center">
            <p className="text-[#45556c] text-lg mb-2">No events found</p>
            <p className="text-sm text-[#62748e]">
              Try adjusting your search or category filter.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default EventsPage;
