import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Run {
  id: string;
  distance: number;
  time: string;
  date: string;
  tokens: number;
  status: 'pending' | 'approved' | 'rejected';
  movements: number;
}

interface RunHistoryProps {
  wallet: string;
}

const RunHistory: React.FC<RunHistoryProps> = ({ wallet }) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      loadUserRuns();
    }
  }, [wallet]);

  const loadUserRuns = async () => {
    try {
      const runsQuery = query(
        collection(db, 'runs'),
        where('wallet', '==', wallet),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(runsQuery);
      const runsData: Run[] = [];
      
      querySnapshot.forEach((doc) => {
        runsData.push({
          id: doc.id,
          ...doc.data()
        } as Run);
      });
      
      setRuns(runsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading runs:', error);
      setLoading(false);
    }
  };

  const getTotalEarned = () => {
    return runs
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  const getTotalPending = () => {
    return runs
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading your runs...</div>;
  }

  return (
    <div style={{ 
      marginTop: '20px', 
      padding: '20px', 
      backgroundColor: '#f8f9fa',
      borderRadius: '10px'
    }}>
      <h2>Your Run History</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {getTotalEarned()} FYTS
          </div>
          <div style={{ color: '#155724' }}>Tokens Earned</div>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {getTotalPending()} FYTS
          </div>
          <div style={{ color: '#856404' }}>Pending Approval</div>
        </div>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {runs.map(run => (
          <div key={run.id} style={{ 
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>
                {run.distance.toFixed(3)} miles in {run.time}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {new Date(run.date).toLocaleDateString()} at {new Date(run.date).toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {run.movements} movements tracked
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold' }}>
                {run.tokens} FYTS
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: 
                  run.status === 'approved' ? '#d4edda' : 
                  run.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                color: 
                  run.status === 'approved' ? '#155724' : 
                  run.status === 'rejected' ? '#721c24' : '#856404'
              }}>
                {run.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {runs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No runs yet. Complete your first run to see it here!
        </div>
      )}
    </div>
  );
};

export default RunHistory;