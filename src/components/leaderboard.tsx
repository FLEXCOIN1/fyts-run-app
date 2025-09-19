import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface Run {
  wallet: string;
  distance: number;
  date: string;
}

const Leaderboard: React.FC = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const q = query(
          collection(db, "runs"),
          orderBy("distance", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const results: Run[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          results.push({
            wallet: data.wallet,
            distance: data.distance,
            date: data.date,
          });
        });
        setRuns(results);
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, []);

  if (loading) return <p>Loading leaderboard...</p>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "15px" }}>🏆 Leaderboard</h2>
      <ol>
        {runs.map((run, index) => (
          <li key={index}>
            {run.wallet.substring(0, 6)}...{run.wallet.substring(38)} —{" "}
            {run.distance.toFixed(2)} mi
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
