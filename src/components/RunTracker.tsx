import React, { useState, useEffect } from 'react';

const RunTracker: React.FC = () => {
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [positions, setPositions] = useState<GeolocationPosition[]>([]);
  const [error, setError] = useState('');

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported');
      return;
    }

    setTracking(true);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setPositions(prev => [...prev, position]);
        // Calculate distance (simplified)
        if (positions.length > 0) {
          const lastPos = positions[positions.length - 1];
          const dist = calculateDistance(
            lastPos.coords.latitude,
            lastPos.coords.longitude,
            position.coords.latitude,
            position.coords.longitude
          );
          setDistance(prev => prev + dist);
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    );

    // Store watchId for cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula for distance
    const R = 3959; // miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const stopTracking = () => {
    setTracking(false);
    // Save run data
    const runData = {
      distance,
      positions,
      timestamp: new Date().toISOString()
    };
    console.log('Run complete:', runData);
    alert(`Run complete! Distance: ${distance.toFixed(2)} miles`);
  };

  return (
    <div style={{padding: '20px', border: '1px solid #ccc', marginTop: '20px'}}>
      <h2>Track Run</h2>
      {!tracking ? (
        <button onClick={startTracking}>Start Run</button>
      ) : (
        <div>
          <p>Distance: {distance.toFixed(2)} miles</p>
          <button onClick={stopTracking}>Stop Run</button>
        </div>
      )}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
};

export default RunTracker;