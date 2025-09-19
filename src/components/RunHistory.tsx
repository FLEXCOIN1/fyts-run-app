import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface Run {
  id: string;
  wallet: string;
  distance: number;
  time: string;
  date: string;
  tokens: number;
  status: string;
  gpsUpdates?: number;
  movements?: number;
}

interface RunHistoryProps {
  wallet: string;
}

const RunHistory: React.FC<RunHistoryProps> = ({ wallet }) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const q = query(
          collection(db, 'runs'),
          where('wallet', '==', wallet),
          orderBy('date', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const runsData: Run[] = [];
        
        querySnapshot.forEach((doc) => {
          runsData.push({
            id: doc.id,
            ...doc.data()
          } as Run);
        });
        
        setRuns(runsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching runs:', err);
        setError('Failed to load run history');
        setLoading(false);
      }
    };

    if (wallet) {
      fetchRuns();
    }
  }, [wallet]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginTop: '10px'
      }}>
        Loading validation history...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '8px',
        marginTop: '10px'
      }}>
        {error}
      </div>
    );
  }

  const pendingRuns = runs.filter(run => run.status === 'pending');
  const approvedRuns = runs.filter(run => run.status === 'approved');
  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalTokens = approvedRuns.reduce((sum, run) => sum + run.tokens, 0);
  const pendingTokens = pendingRuns.reduce((sum, run) => sum + run.tokens, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '10px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
        Validation History
      </h3>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {runs.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Runs</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {totalTokens}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>FYTS Earned</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {pendingTokens}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>FYTS Pending</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
            {totalDistance.toFixed(1)}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Miles Total</div>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingRuns.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
            {pendingRuns.length} Pending Approval{pendingRuns.length !== 1 ? 's' : ''}
          </h4>
          <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
            Your recent submissions are being reviewed. Tokens will be distributed 
            within 3-5 business days after approval.
          </p>
        </div>
      )}

      {/* Runs List */}
      {runs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '8px'
        }}>
          No validation history yet. Complete your first run to see results here!
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
            gap: '10px',
            padding: '15px',
            backgroundColor: '#e9ecef',
            fontWeight: 'bold',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}>
            <div>Date</div>
            <div>Distance</div>
            <div>Time</div>
            <div>Tokens</div>
            <div>Status</div>
          </div>

          {runs.map((run, index) => (
            <div
              key={run.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
                gap: '10px',
                padding: '15px',
                borderBottom: index < runs.length - 1 ? '1px solid #dee2e6' : 'none',
                fontSize: '14px'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {new Date(run.date).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(run.date).toLocaleTimeString()}
                </div>
              </div>
              
              <div style={{ fontWeight: 'bold' }}>
                {run.distance.toFixed(2)} mi
              </div>
              
              <div>
                {run.time}
              </div>
              
              <div style={{ 
                fontWeight: 'bold',
                color: run.status === 'approved' ? '#28a745' : '#ffc107'
              }}>
                {run.tokens} FYTS
              </div>
              
              <div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: getStatusColor(run.status)
                }}>
                  {getStatusText(run.status)}
                </span>
                {run.gpsUpdates && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {run.gpsUpdates} GPS points
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RunHistory;