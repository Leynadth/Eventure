import { useState, useEffect, useRef } from "react";

/**
 * AddressAutocomplete component using OpenStreetMap Nominatim API (FREE, no API key required)
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Callback when input changes
 * @param {Function} props.onPlaceSelect - Callback when a place is selected (receives place object)
 * @param {Function} props.onValidationChange - Callback when validation state changes (receives isValid boolean)
 * @param {string} props.placeholder - Input placeholder text
 * @param {string} props.id - Input id
 * @param {string} props.name - Input name
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.required - Whether field is required
 */
function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onValidationChange,
  placeholder = "Enter address",
  id,
  name,
  className = "",
  required = false,
}) {
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [selectedAddressData, setSelectedAddressData] = useState(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced search function
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Use OpenStreetMap Nominatim API (free, no API key needed)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=us`;
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          "User-Agent": "EventureApp/1.0", // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch address suggestions");
      }

      const data = await response.json();
      
      // Transform Nominatim results to our format
      const formattedSuggestions = data.map((item) => ({
        display_name: item.display_name,
        address: item.address || {},
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error fetching address suggestions:", error);
        setSuggestions([]);
      }
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const query = e.target.value;
    
    // Update value immediately (for controlled component)
    if (onChange) {
      onChange(e);
    }
    
    // If user manually edits after selecting, clear the selection
    // Compare against the selected value that was set
    if (isAddressSelected && selectedAddressData) {
      const expectedValue = selectedAddressData.selectedValue || selectedAddressData.formatted_address || selectedAddressData.address_line1;
      if (query !== expectedValue) {
        setIsAddressSelected(false);
        setSelectedAddressData(null);
        if (onValidationChange) {
          onValidationChange(false);
        }
      }
    }
    
    // If input is cleared, reset validation
    if (!query) {
      setIsAddressSelected(false);
      setSelectedAddressData(null);
      if (onValidationChange) {
        onValidationChange(false);
      }
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the search (wait 300ms after user stops typing)
    debounceTimerRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  // Handle address selection
  const handleSelectAddress = (suggestion) => {
    const addressData = parseAddressComponents(suggestion);
    const selectedValue = suggestion.display_name;
    
    // Store the selected value for comparison
    setSelectedAddressData({
      ...addressData,
      selectedValue: selectedValue, // Store the exact value we're setting
    });
    
    // Update input value through onChange (for controlled component)
    const syntheticEvent = {
      target: {
        name: name || "address_line1",
        value: selectedValue,
      },
    };
    
    // Update the parent component's state first
    if (onChange) {
      onChange(syntheticEvent);
    }

    // Call callback with parsed address data (this populates city, state, zip_code)
    if (onPlaceSelect) {
      onPlaceSelect(addressData);
    }

    // Mark address as selected
    setIsAddressSelected(true);
    
    // Notify parent that address is valid
    if (onValidationChange) {
      onValidationChange(true);
    }

    // Hide suggestions
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Clear any pending debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  // Parse address components from Nominatim result
  const parseAddressComponents = (item) => {
    const addr = item.address || {};
    
    // Extract components
    const streetNumber = addr.house_number || "";
    const streetName = addr.road || addr.street || "";
    const city = (addr.city || addr.town || addr.village || addr.municipality || "").trim();
    
    // Extract state - OpenStreetMap returns state in various formats
    // Try to get the shortest version (abbreviation if available)
    let state = (addr.state || "").trim();
    // If state is too long, try to extract just the state name (before any commas or extra text)
    if (state.length > 50) {
      state = state.split(',')[0].trim();
    }
    // If still too long, truncate
    if (state.length > 50) {
      state = state.substring(0, 50);
    }
    
    const zipCode = (addr.postcode || "").trim();
    const country = (addr.country || "").trim();

    // Build address_line1 (street number + street name)
    const addressLine1 = [streetNumber, streetName].filter(Boolean).join(" ");

    return {
      formatted_address: item.display_name,
      address_line1: addressLine1 || item.display_name,
      street_number: streetNumber,
      route: streetName,
      city: city ? city.substring(0, 100) : "", // Truncate to match DB column size
      state: state.substring(0, 50), // Truncate to match DB column size (VARCHAR(50)) - already handled above
      zip_code: zipCode ? zipCode.substring(0, 10) : "", // Truncate to match DB column size (VARCHAR(10))
      country: country,
      lat: item.lat,
      lng: item.lng,
    };
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectAddress(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  };

  // Sync selected state with value prop (in case parent updates it)
  useEffect(() => {
    if (isAddressSelected && selectedAddressData) {
      const expectedValue = selectedAddressData.selectedValue || selectedAddressData.formatted_address || selectedAddressData.address_line1;
      if (value !== expectedValue) {
        // Value changed externally, might need to re-validate
        // But only clear if it's a different value (not just empty)
        if (value && value !== expectedValue) {
          setIsAddressSelected(false);
          setSelectedAddressData(null);
          if (onValidationChange) {
            onValidationChange(false);
          }
        }
      } else if (value === expectedValue && !isAddressSelected) {
        // Value matches expected, but state says not selected - fix it
        setIsAddressSelected(true);
        if (onValidationChange) {
          onValidationChange(true);
        }
      }
    }
  }, [value, isAddressSelected, selectedAddressData, onValidationChange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={`${className} pr-10 ${!isAddressSelected && value ? "border-yellow-500 focus:ring-yellow-500" : ""} ${isAddressSelected ? "border-green-500 focus:ring-green-500" : ""}`}
          required={required}
          autoComplete="off"
        />
        {/* Success indicator */}
        {isAddressSelected && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-500"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Validation message */}
      {!isAddressSelected && value && (
        <p className="mt-1 text-xs text-yellow-600">
          Please select an address from the dropdown
        </p>
      )}
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-[#cad5e2] rounded-lg shadow-lg max-h-60 overflow-auto"
          onMouseDown={(e) => {
            // Prevent input from losing focus when clicking dropdown
            e.preventDefault();
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectAddress(suggestion);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? "bg-gray-50" : ""
              } ${index === 0 ? "rounded-t-lg" : ""} ${
                index === suggestions.length - 1 ? "rounded-b-lg" : ""
              }`}
            >
              <p className="text-sm text-[#0f172b]">{suggestion.display_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
