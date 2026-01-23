import { useState } from "react";

function EventCard({ title, date, location, category, price, imageUrl, viewMode = "grid" }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const isFree = price === 0 || price === null || price === undefined;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const handleRSVPClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // RSVP functionality will be implemented later
  };

  if (viewMode === "list") {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="w-full md:w-64 h-48 md:h-auto bg-gradient-to-br from-[#2e6b4e] to-[#255a43] flex items-center justify-center shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/70 text-sm">Event Image</span>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {category && (
                    <span className="px-2 py-1 bg-[#2e6b4e]/10 text-[#2e6b4e] text-xs font-medium rounded">
                      {category}
                    </span>
                  )}
                  {isFree && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Free
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-[#0f172b] mb-2">{title}</h3>
              </div>
              <button
                onClick={handleFavoriteClick}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={isFavorited ? "#ef4444" : "none"}
                  stroke={isFavorited ? "#ef4444" : "currentColor"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#45556c]"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {date && (
                <p className="text-sm text-[#45556c] flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {date}
                </p>
              )}
              {location && (
                <p className="text-sm text-[#45556c] flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {location}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-lg font-semibold text-[#0f172b]">
                {isFree ? "Free" : `$${price}`}
              </div>
              <button
                onClick={handleRSVPClick}
                className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
              >
                RSVP
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Image Section */}
      <div className="relative w-full h-48 bg-gradient-to-br from-[#2e6b4e] to-[#255a43] flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/70 text-sm">Event Image</span>
        )}
        {/* Category and Free Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {category && (
            <span className="px-2 py-1 bg-white/90 text-[#2e6b4e] text-xs font-medium rounded">
              {category}
            </span>
          )}
          {isFree && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
              Free
            </span>
          )}
        </div>
        {/* Heart Icon */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isFavorited ? "#ef4444" : "none"}
            stroke={isFavorited ? "#ef4444" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#45556c]"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-lg font-semibold text-[#0f172b] line-clamp-2">{title}</h3>
        {date && (
          <p className="text-sm text-[#45556c] flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {date}
          </p>
        )}
        {location && (
          <p className="text-sm text-[#45556c] flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="text-base font-semibold text-[#0f172b]">
            {isFree ? "Free" : `$${price}`}
          </div>
          <button
            onClick={handleRSVPClick}
            className="px-4 py-2 bg-[#2e6b4e] text-white rounded-lg text-sm font-medium hover:bg-[#255a43] transition-colors"
          >
            RSVP
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
