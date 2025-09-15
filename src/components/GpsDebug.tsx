import { useState } from "react";

export default function GpsDebug() {
  const [status, setStatus] = useState("Idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const getLocation = () => {
    setStatus("Requesting...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCoords({ lat, lon });
          setStatus("Success ✅");
        },
        (err) => {
          setStatus("Error ❌: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setStatus("Geolocation not supported ❌");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>GPS Debug Test</h2>
      <button onClick={getLocation}>Get Location</button>
      <p>Status: {status}</p>

      {coords && (
        <div style={{ marginTop: "20px" }}>
          <p>Latitude: {coords.lat}</p>
          <p>Longitude: {coords.lon}</p>
        </div>
      )}
    </div>
  );
}