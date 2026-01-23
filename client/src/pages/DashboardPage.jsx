import { Link } from "react-router-dom";
import { getUserRole } from "../utils/auth";
import AppShell from "../components/layout/AppShell";
import EventCard from "../components/events/EventCard";

// Placeholder events data
const PLACEHOLDER_EVENTS = [
  {
    id: 1,
    title: "Summer Music Festival 2024",
    date: "June 15, 2024",
    location: "Central Park, New York",
  },
  {
    id: 2,
    title: "Tech Innovation Summit",
    date: "July 20, 2024",
    location: "San Francisco Convention Center",
  },
  {
    id: 3,
    title: "Food & Wine Expo",
    date: "August 10, 2024",
    location: "Chicago Navy Pier",
  },
];

const PLACEHOLDER_MY_EVENTS = [
  {
    id: 1,
    title: "My First Event",
    date: "June 1, 2024",
    status: "Published",
  },
  {
    id: 2,
    title: "Community Meetup",
    date: "July 5, 2024",
    status: "Draft",
  },
];

function DashboardPage() {
  const role = getUserRole();

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-[#0f172b] mb-2">
            Welcome back!
          </h1>
          <p className="text-[#45556c]">
            {role === "admin"
              ? "Manage the platform and oversee events."
              : role === "organizer"
              ? "Create and manage your events."
              : "Discover and explore exciting events near you."}
          </p>
        </div>

        {/* User Role Content */}
        {role === "user" && (
          <>
            {/* Browse Categories */}
            <section>
              <h2 className="text-2xl font-semibold text-[#0f172b] mb-4">
                Browse
              </h2>
              <div className="flex flex-wrap gap-3 mb-6">
                {["Music", "Food", "Tech"].map((category) => (
                  <button
                    key={category}
                    className="px-4 py-2 bg-white border border-[#cad5e2] rounded-lg text-[#314158] hover:border-[#2e6b4e] hover:text-[#2e6b4e] transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            {/* Upcoming Events */}
            <section>
              <h2 className="text-2xl font-semibold text-[#0f172b] mb-4">
                Upcoming Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PLACEHOLDER_EVENTS.map((event) => (
                  <EventCard
                    key={event.id}
                    title={event.title}
                    date={event.date}
                    location={event.location}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Organizer Role Content */}
        {role === "organizer" && (
          <>
            {/* Create Event CTA */}
            <section>
              <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-[#0f172b] mb-2">
                  Create Your First Event
                </h2>
                <p className="text-[#45556c] mb-4">
                  Start organizing and share your event with the community.
                </p>
                <Link
                  to="/events/new"
                  className="inline-block px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors"
                >
                  Create Event
                </Link>
              </div>
            </section>

            {/* Your Events */}
            <section>
              <h2 className="text-2xl font-semibold text-[#0f172b] mb-4">
                Your Events
              </h2>
              <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
                {PLACEHOLDER_MY_EVENTS.length > 0 ? (
                  <div className="divide-y divide-[#e2e8f0]">
                    {PLACEHOLDER_MY_EVENTS.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <h3 className="font-medium text-[#0f172b]">
                            {event.title}
                          </h3>
                          <p className="text-sm text-[#45556c] mt-1">
                            {event.date} • {event.status}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled
                            className="px-3 py-1.5 text-sm text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            View
                          </button>
                          <button
                            disabled
                            className="px-3 py-1.5 text-sm text-[#2e6b4e] border border-[#2e6b4e] rounded-lg hover:bg-[#2e6b4e] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#45556c]">
                    <p>You haven't created any events yet.</p>
                    <Link
                      to="/events/new"
                      className="mt-4 inline-block text-[#2e6b4e] hover:underline"
                    >
                      Create your first event
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Admin Role Content */}
        {role === "admin" && (
          <section>
            <h2 className="text-2xl font-semibold text-[#0f172b] mb-4">
              Admin Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "User Management", icon: "👥" },
                { title: "Event Moderation", icon: "📋" },
                { title: "Reports", icon: "📊" },
              ].map((tool, index) => (
                <div
                  key={index}
                  className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-6 text-center"
                >
                  <div className="text-4xl mb-3">{tool.icon}</div>
                  <h3 className="font-semibold text-[#0f172b] mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-[#62748e]">Coming soon</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

export default DashboardPage;
