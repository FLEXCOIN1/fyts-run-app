import { useState } from "react";

export default function GpsOneShot() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setError(null);
          console.log("Got location:", pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setError(err.message);
          console.error("GPS error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError("Geolocation not supported in this browser.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>GPS One-Shot Test</h2>
      <button onClick={getLocation}>Get Location</button>

      {coords && (
        <div style={{ marginTop: "20px" }}>
          <p>Latitude: {coords.lat}</p>
          <p>Longitude: {coords.lon}</p>
        </div>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}