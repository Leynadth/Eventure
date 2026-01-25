import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Component to update map center when coordinates change
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function EventMap({ address, venue, city, state, zipCode, lat, lng }) {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const geocodeAddress = async () => {
      try {
        setLoading(true);
        setError(null);

        // If we have lat/lng directly, use them
        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
          setPosition([parseFloat(lat), parseFloat(lng)]);
          setLoading(false);
          return;
        }

        // Build address string - try multiple formats for better geocoding
        // Clean up address components
        const cleanAddress = address ? address.replace(/,/g, "").trim() : "";
        const cleanCity = city ? city.trim() : "";
        const cleanState = state ? state.trim() : "";
        const cleanZip = zipCode ? zipCode.trim() : "";

        // Try different address formats
        const addressFormats = [];

        // Format 1: Simple street address, city, state zip (most reliable)
        if (cleanAddress && cleanCity && cleanState && cleanZip) {
          addressFormats.push(`${cleanAddress}, ${cleanCity}, ${cleanState} ${cleanZip}`);
        }

        // Format 2: Without venue, just address components
        if (cleanAddress && cleanCity && cleanState) {
          addressFormats.push(`${cleanAddress}, ${cleanCity}, ${cleanState}`);
        }

        // Format 3: Include venue if available
        if (venue && cleanAddress && cleanCity && cleanState && cleanZip) {
          const cleanVenue = venue.replace(/,/g, "").trim();
          addressFormats.push(`${cleanVenue}, ${cleanAddress}, ${cleanCity}, ${cleanState} ${cleanZip}`);
        }

        // Format 4: Just city, state zip
        if (cleanCity && cleanState && cleanZip) {
          addressFormats.push(`${cleanCity}, ${cleanState} ${cleanZip}`);
        }

        if (addressFormats.length === 0) {
          setError("No address provided");
          setLoading(false);
          return;
        }

        // Try each format until one works
        let geocoded = false;
        for (const fullAddress of addressFormats) {
          try {
            // Use OpenStreetMap Nominatim API for geocoding (free)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "Eventure/1.0 (https://eventure.com/contact)", // Required by Nominatim
                },
              }
            );

            if (!response.ok) {
              continue; // Try next format
            }

            const data = await response.json();

            if (data && data.length > 0) {
              const resultLat = parseFloat(data[0].lat);
              const resultLon = parseFloat(data[0].lon);
              if (!isNaN(resultLat) && !isNaN(resultLon)) {
                setPosition([resultLat, resultLon]);
                geocoded = true;
                break; // Success!
              }
            }
          } catch (err) {
            console.warn(`Geocoding failed for format: ${fullAddress}`, err);
            continue; // Try next format
          }
        }

        if (!geocoded) {
          setError("Address not found");
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setError("Failed to load map");
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address, venue, city, state, zipCode, lat, lng]);

  // Build display address
  const displayAddress = [venue, address, [city, state].filter(Boolean).join(", "), zipCode]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg flex items-center justify-center border border-[#cad5e2]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e6b4e] mx-auto mb-2"></div>
          <p className="text-sm text-[#45556c]">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg flex items-center justify-center border border-[#cad5e2]">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#62748e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm text-[#45556c]">{displayAddress || "Address not available"}</p>
          {error && <p className="text-xs text-[#62748e] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[250px] rounded-lg overflow-hidden border border-[#cad5e2]">
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{venue || "Event Location"}</p>
              <p className="text-gray-600">{displayAddress}</p>
            </div>
          </Popup>
        </Marker>
        <MapUpdater center={position} />
      </MapContainer>
    </div>
  );
}

export default EventMap;
