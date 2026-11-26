

/* ==========================================
   SUKOON — GLOBAL LOCATION SYSTEM
   Worldwide search • GPS • Reverse geocoding
   Shared location • Local storage • Timezone
========================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "sukoon_location";
  const SEARCH_API = "https://geocoding-api.open-meteo.com/v1/search";
  const REVERSE_API = "https://nominatim.openstreetmap.org/reverse";

  const DEFAULT_LANGUAGE = "en";

  function readSavedLocation() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("SUKOON: Could not read saved location.", error);
      return null;
    }
  }

  function saveLocation(location) {
    if (
      !location ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude)
    ) {
      throw new Error("Invalid location data.");
    }

    const cleanLocation = {
      name: location.name || "",
      city: location.city || location.name || "",
      region: location.region || "",
      country: location.country || "",
      countryCode: location.countryCode || "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || "",
      source: location.source || "manual",
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLocation));

    window.dispatchEvent(
      new CustomEvent("sukoon:locationChanged", {
        detail: cleanLocation
      })
    );

    return cleanLocation;
  }

  function getLocation() {
    return readSavedLocation();
  }

  function getCoordinates() {
    const location = getLocation();

    if (!location) return null;

    return {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  async function searchPlaces(query, options = {}) {
    const term = String(query || "").trim();

    if (term.length < 2) {
      return [];
    }

    const params = new URLSearchParams({
      name: term,
      count: String(options.count || 15),
      language: options.language || DEFAULT_LANGUAGE,
      format: "json"
    });

    if (options.countryCode) {
      params.set("countryCode", options.countryCode);
    }

    const response = await fetch(`${SEARCH_API}?${params}`);

    if (!response.ok) {
      throw new Error("Location search is temporarily unavailable.");
    }

    const data = await response.json();

    return (data.results || []).map(place => ({
      name: place.name || "",
      city: place.name || "",
      region: place.admin1 || "",
      country: place.country || "",
      countryCode: place.country_code || "",
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      timezone: place.timezone || "",
      source: "search"
    }));
  }

  function getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
        error => {
          const messages = {
            1: "Location permission was denied.",
            2: "Your current location could not be determined.",
            3: "Location request timed out."
          };

          reject(new Error(
            messages[error.code] || "Could not get your location."
          ));
        },
        {
          enableHighAccuracy: true,
          timeout: options.timeout || 15000,
          maximumAge: options.maximumAge || 300000
        }
      );
    });
  }

  async function reverseGeocode(latitude, longitude) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      "accept-language": "en"
    });

    const response = await fetch(`${REVERSE_API}?${params}`);

    if (!response.ok) {
      throw new Error("Could not identify this location.");
    }

    const data = await response.json();
    const address = data.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.state ||
      "";

    return {
      name: city || data.display_name || "My Location",
      city,
      region: address.state || address.region || "",
      country: address.country || "",
      countryCode: (address.country_code || "").toUpperCase(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: "",
      source: "gps"
    };
  }

  async function useGPS() {
    const coordinates = await getCurrentPosition();
    const place = await reverseGeocode(
      coordinates.latitude,
      coordinates.longitude
    );

    return saveLocation(place);
  }

  function selectLocation(place) {
    return saveLocation({
      ...place,
      source: "manual"
    });
  }

  function clearLocation() {
    localStorage.removeItem(STORAGE_KEY);

    window.dispatchEvent(
      new CustomEvent("sukoon:locationChanged", {
        detail: null
      })
    );
  }

  function getLocalTimeZone() {
    const location = getLocation();

    return location?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Public API for all SUKOON features
  window.SukoonLocation = Object.freeze({
    getLocation,
    getCoordinates,
    searchPlaces,
    useGPS,
    selectLocation,
    clearLocation,
    getLocalTimeZone
  });

  console.log("SUKOON Global Location System loaded.");

})();
