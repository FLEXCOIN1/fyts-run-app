import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

interface Run {
  id: string;
  wallet: string;
  distance: number;
  time: string;
  duration: number;
  date: string;
  tokens: number;
  status: 'pending' | 'approved' | 'rejected';
  gpsUpdates: number;
  movements: number;
}

const AdminDashboard: React.FC = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const runsQuery = query(collection(db, 'runs'), orderBy('date', 'desc'));
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

  const updateRunStatus = async (runId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const runRef = doc(db, 'runs', runId);
      await updateDoc(runRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setRuns(runs.map(run => 
        run.id === runId ? { ...run, status: newStatus } : run
      ));
      
      alert(`Run ${newStatus}!`);
    } catch (error) {
      console.error('Error updating run:', error);
      alert('Error updating run status');
    }
  };

  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true;
    return run.status === filter;
  });

  const getTotalPendingTokens = () => {
    return runs
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  const getTotalApprovedTokens = () => {
    return runs
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  const exportApprovedRuns = () => {
    const approved = runs.filter(r => r.status === 'approved' && r.tokens > 0);
    const csv = 'Wallet,Tokens\n' + approved.map(r => `${r.wallet},${r.tokens}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fyts-approved-runs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading runs...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Admin Dashboard</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setFilter('all')} 
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'all' ? '#007bff' : '#e0e0e0',
            color: filter === 'all' ? 'white' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          All ({runs.length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'pending' ? '#ffc107' : '#e0e0e0',
            color: filter === 'pending' ? 'black' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Pending ({runs.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('approved')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'approved' ? '#28a745' : '#e0e0e0',
            color: filter === 'approved' ? 'white' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Approved ({runs.filter(r => r.status === 'approved').length})
        </button>
        <button 
          onClick={loadRuns}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <div>Pending Tokens: <strong>{getTotalPendingTokens().toFixed(1)} FYTS</strong></div>
          <div>Approved Tokens: <strong>{getTotalApprovedTokens().toFixed(1)} FYTS</strong></div>
        </div>
        <button 
          onClick={exportApprovedRuns}
          style={{
            padding: '8px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Export Approved CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date/Time</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Wallet</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Distance</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Pace</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Movements</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tokens</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map(run => {
              const pace = run.duration > 0 && run.distance > 0 
                ? (run.duration / 60) / run.distance 
                : 0;
              const paceStr = pace > 0 && pace < 99 
                ? `${Math.floor(pace)}:${Math.floor((pace % 1) * 60).toString().padStart(2, '0')} /mi`
                : '--:--';

              return (
                <tr key={run.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {new Date(run.date).toLocaleDateString()}<br/>
                    <small style={{ color: '#6c757d' }}>
                      {new Date(run.date).toLocaleTimeString()}
                    </small>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {run.wallet.substring(0, 6)}...{run.wallet.substring(38)}
                  </td>
                  <td style={{ padding: '12px' }}>{run.distance.toFixed(3)} mi</td>
                  <td style={{ padding: '12px' }}>{run.time}</td>
                  <td style={{ padding: '12px' }}>{paceStr}</td>
                  <td style={{ padding: '12px' }}>{run.movements}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {run.tokens} FYTS
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: 
                        run.status === 'approved' ? '#d4edda' : 
                        run.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                      color: 
                        run.status === 'approved' ? '#155724' : 
                        run.status === 'rejected' ? '#721c24' : '#856404'
                    }}>
                      {run.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {run.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => updateRunStatus(run.id, 'approved')}
                          style={{ 
                            padding: '6px 12px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => updateRunStatus(run.id, 'rejected')}
                          style={{ 
                            padding: '6px 12px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRuns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          No runs found
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;