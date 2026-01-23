import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { getUserRole } from "../utils/auth";

const CATEGORIES = ["Music", "Food", "Tech"];

function CreateEventPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    description: "",
    isPublic: true,
  });
  const [showMessage, setShowMessage] = useState(false);

  // Check if user can create events
  if (role === "user") {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-[#0f172b] mb-4">
              Access Restricted
            </h1>
            <p className="text-[#45556c] mb-6">
              Only organizers can create events.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Show placeholder message
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  const inputBase =
    "w-full h-12 px-4 rounded-lg border border-[#cad5e2] text-base placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0f172b] mb-2">
            Create Event
          </h1>
          <p className="text-[#45556c]">
            Fill out the form below to create a new event.
          </p>
        </div>

        {showMessage && (
          <div className="bg-green-50 text-[#2e6b4e] p-4 rounded-lg text-center">
            Backend coming next. Event creation will be available soon.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-6 space-y-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-[#314158]">
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter event title"
              className={inputBase}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="category"
              className="text-sm font-medium text-[#314158]"
            >
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className={`${inputBase} cursor-pointer`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="location"
              className="text-sm font-medium text-[#314158]"
            >
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Enter event location"
              className={inputBase}
            />
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="startDate"
                className="text-sm font-medium text-[#314158]"
              >
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="startTime"
                className="text-sm font-medium text-[#314158]"
              >
                Start Time *
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className={inputBase}
              />
            </div>
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="endDate"
                className="text-sm font-medium text-[#314158]"
              >
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="endTime"
                className="text-sm font-medium text-[#314158]"
              >
                End Time *
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className={inputBase}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-medium text-[#314158]"
            >
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Describe your event..."
              className="w-full px-4 py-3 rounded-lg border border-[#cad5e2] text-base placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#2e6b4e] focus:border-transparent resize-none"
            />
          </div>

          {/* Public Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="w-4 h-4 text-[#2e6b4e] border-[#cad5e2] rounded focus:ring-[#2e6b4e]"
            />
            <label htmlFor="isPublic" className="text-sm text-[#314158]">
              Make this event public
            </label>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e2e8f0]">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#2e6b4e] text-white rounded-lg font-medium hover:bg-[#255a43] transition-colors"
            >
              Create Event
            </button>
            <Link
              to="/dashboard"
              className="flex-1 px-6 py-3 bg-white border border-[#cad5e2] text-[#314158] rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default CreateEventPage;
