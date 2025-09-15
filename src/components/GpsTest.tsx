import { useState, useEffect } from "react";

export default function GpsTest() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = () => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (err) => {
          console.error("GPS error:", err);
          alert("Error accessing GPS. Please allow location in MetaMask settings.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      setWatchId(id);
    } else {
      alert("GPS not supported in this browser.");
    }
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      alert("Tracking stopped.");
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>GPS Test Page</h2>
      <button onClick={startTracking} style={{ marginRight: "10px" }}>
        Start Tracking
      </button>
      <button onClick={stopTracking}>Stop Tracking</button>

      {coords ? (
        <div style={{ marginTop: "20px" }}>
          <p>Latitude: {coords.lat}</p>
          <p>Longitude: {coords.lon}</p>
        </div>
      ) : (
        <p style={{ marginTop: "20px" }}>No location data yet.</p>
      )}
    </div>
  );
}