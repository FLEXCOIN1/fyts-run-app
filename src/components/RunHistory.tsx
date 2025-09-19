import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
  createdAt?: any;
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
      if (!wallet) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Simple query without orderBy to avoid index issues
        const q = query(
          collection(db, 'runs'),
          where('wallet', '==', wallet)
        );
        
        const querySnapshot = await getDocs(q);
        const runsData: Run[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          runsData.push({
            id: doc.id,
            wallet: data.wallet || '',
            distance: data.distance || 0,
            time: data.time || '0:00:00',
            date: data.date || new Date().toISOString(),
            tokens: data.tokens || 0,
            status: data.status || 'pending',
            gpsUpdates: data.gpsUpdates,
            movements: data.movements,
            createdAt: data.createdAt
          });
        });
        
        // Sort client-side by date (newest first)
        runsData.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // Descending order
        });
        
        setRuns(runsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching runs:', err);
        setError('Failed to load run history. Please check your connection and try again.');
        setLoading(false);
      }
    };

    fetchRuns();
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
        <div style={{ 
          fontSize: '16px', 
          marginBottom: '10px' 
        }}>
          Loading validation history...
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#666' 
        }}>
          Retrieving your movement validation data
        </div>
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
        marginTop: '10px',
        border: '1px solid #f5c6cb'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          Unable to Load History
        </div>
        <div style={{ fontSize: '14px' }}>
          {error}
        </div>
      </div>
    );
  }

  // Calculate stats
  const pendingRuns = runs.filter(run => run.status === 'pending');
  const approvedRuns = runs.filter(run => run.status === 'approved');
  const rejectedRuns = runs.filter(run => run.status === 'rejected');
  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalTokens = approvedRuns.reduce((sum, run) => sum + run.tokens, 0);
  const pendingTokens = pendingRuns.reduce((sum, run) => sum + run.tokens, 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: 'Invalid Date', time: '' };
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
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
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

      {/* Status Summary */}
      {runs.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#ffc107' }}>{pendingRuns.length}</div>
            <div style={{ color: '#666' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#28a745' }}>{approvedRuns.length}</div>
            <div style={{ color: '#666' }}>Approved</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#dc3545' }}>{rejectedRuns.length}</div>
            <div style={{ color: '#666' }}>Rejected</div>
          </div>
        </div>
      )}

      {/* Runs List */}
      {runs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            No validation history yet
          </div>
          <div style={{ fontSize: '14px' }}>
            Complete your first run to see results here!
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Header */}
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
            <div>Date & Time</div>
            <div>Distance</div>
            <div>Duration</div>
            <div>Tokens</div>
            <div>Status</div>
          </div>

          {/* Runs */}
          {runs.map((run, index) => {
            const formattedDate = formatDate(run.date);
            
            return (
              <div
                key={run.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
                  gap: '10px',
                  padding: '15px',
                  borderBottom: index < runs.length - 1 ? '1px solid #dee2e6' : 'none',
                  fontSize: '14px',
                                 }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {formattedDate.date}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {formattedDate.time}
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
                      {run.movements && ` • ${run.movements} movements`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Note */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Validation history shows all submitted movement data • 
        Pending approvals are reviewed within 3-5 business days • 
        Approved tokens are distributed via bulk transfer
      </div>
    </div>
  );
};

export default RunHistory;