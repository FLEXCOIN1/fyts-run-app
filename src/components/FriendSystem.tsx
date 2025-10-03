import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';

interface FriendSystemProps {
  wallet: string;
  username: string;
}

interface Friend {
  wallet: string;
  username: string;
  totalDistance: number;
  totalRuns: number;
  status: 'pending' | 'accepted';
  friendshipId: string;
  isRequester: boolean;
}

interface User {
  wallet: string;
  username: string;
}

const FriendSystem: React.FC<FriendSystemProps> = ({ wallet, username }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Fetch friends and pending requests
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        // Query where user is requester
        const q1 = query(
          collection(db, 'friendships'),
          where('requester', '==', wallet)
        );
        
        // Query where user is recipient
        const q2 = query(
          collection(db, 'friendships'),
          where('recipient', '==', wallet)
        );

        const [snapshot1, snapshot2] = await Promise.all([
          getDocs(q1),
          getDocs(q2)
        ]);

        const allFriendships: Friend[] = [];
        const pending: Friend[] = [];

        // Process friendships where user is requester
        for (const docSnap of snapshot1.docs) {
          const data = docSnap.data();
          const friendWallet = data.recipient;
          
          // Get friend's username and stats
          const userDoc = await getDocs(query(collection(db, 'users'), where('wallet', '==', friendWallet)));
          const friendUsername = userDoc.docs[0]?.data().username || 'Unknown';
          
          // Get friend's stats
          const runsQuery = query(
            collection(db, 'runs'),
            where('wallet', '==', friendWallet),
            where('status', '==', 'approved')
          );
          const runsSnapshot = await getDocs(runsQuery);
          let totalDistance = 0;
          runsSnapshot.forEach(doc => {
            totalDistance += doc.data().distance || 0;
          });

          const friendData: Friend = {
            wallet: friendWallet,
            username: friendUsername,
            totalDistance,
            totalRuns: runsSnapshot.size,
            status: data.status,
            friendshipId: docSnap.id,
            isRequester: true
          };

          if (data.status === 'accepted') {
            allFriendships.push(friendData);
          } else if (data.status === 'pending') {
            pending.push(friendData);
          }
        }

        // Process friendships where user is recipient
        for (const docSnap of snapshot2.docs) {
          const data = docSnap.data();
          const friendWallet = data.requester;
          
          const userDoc = await getDocs(query(collection(db, 'users'), where('wallet', '==', friendWallet)));
          const friendUsername = userDoc.docs[0]?.data().username || 'Unknown';
          
          const runsQuery = query(
            collection(db, 'runs'),
            where('wallet', '==', friendWallet),
            where('status', '==', 'approved')
          );
          const runsSnapshot = await getDocs(runsQuery);
          let totalDistance = 0;
          runsSnapshot.forEach(doc => {
            totalDistance += doc.data().distance || 0;
          });

          const friendData: Friend = {
            wallet: friendWallet,
            username: friendUsername,
            totalDistance,
            totalRuns: runsSnapshot.size,
            status: data.status,
            friendshipId: docSnap.id,
            isRequester: false
          };

          if (data.status === 'accepted') {
            allFriendships.push(friendData);
          } else if (data.status === 'pending') {
            pending.push(friendData);
          }
        }

        setFriends(allFriendships);
        setPendingRequests(pending);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching friends:', error);
        setLoading(false);
      }
    };

    if (wallet) {
      fetchFriends();
    }
  }, [wallet]);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery),
        where('username', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const results: User[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.wallet !== wallet) { // Don't show self
          results.push({
            wallet: data.wallet,
            username: data.username
          });
        }
      });
      
      setSearchResults(results);
      setSearching(false);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (recipientWallet: string) => {
    try {
      // Check if friendship already exists
      const q1 = query(
        collection(db, 'friendships'),
        where('requester', '==', wallet),
        where('recipient', '==', recipientWallet)
      );
      
      const q2 = query(
        collection(db, 'friendships'),
        where('requester', '==', recipientWallet),
        where('recipient', '==', wallet)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      if (!snap1.empty || !snap2.empty) {
        alert('Friend request already exists or you are already friends');
        return;
      }

      await addDoc(collection(db, 'friendships'), {
        requester: wallet,
        recipient: recipientWallet,
        status: 'pending',
        createdAt: new Date()
      });

      alert('Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: 'accepted',
        acceptedAt: new Date()
      });
      
      // Refresh friends list
      window.location.reload();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request');
    }
  };

  // Decline/Remove friend
  const removeFriend = async (friendshipId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      
      // Refresh friends list
      window.location.reload();
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        padding: '32px',
        marginTop: '20px',
        textAlign: 'center',
        color: '#94A3B8'
      }}>
        Loading friends...
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '20px',
      padding: '32px',
      marginTop: '20px'
    }}>
      <h3 style={{
        textAlign: 'center',
        margin: '0 0 24px 0',
        color: '#E2E8F0',
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Friends & Community
      </h3>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '8px'
      }}>
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'friends' ? 'linear-gradient(135deg, #00F5FF, #00FF88)' : 'transparent',
            color: activeTab === 'friends' ? '#0F0F23' : '#94A3B8',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'requests' ? 'linear-gradient(135deg, #00F5FF, #00FF88)' : 'transparent',
            color: activeTab === 'requests' ? '#0F0F23' : '#94A3B8',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            position: 'relative'
          }}
        >
          Requests
          {pendingRequests.filter(r => !r.isRequester).length > 0 && (
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#FF0080',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {pendingRequests.filter(r => !r.isRequester).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'search' ? 'linear-gradient(135deg, #00F5FF, #00FF88)' : 'transparent',
            color: activeTab === 'search' ? '#0F0F23' : '#94A3B8',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Find Friends
        </button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#64748B'
            }}>
              No friends yet. Search for users to connect!
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: '#E2E8F0',
                      marginBottom: '4px'
                    }}>
                      {friend.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#64748B'
                    }}>
                      {friend.wallet.substring(0, 6)}...{friend.wallet.substring(38)}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#94A3B8',
                      marginTop: '8px'
                    }}>
                      {friend.totalDistance.toFixed(1)} miles • {friend.totalRuns} runs
                    </div>
                  </div>
                  <button
                    onClick={() => removeFriend(friend.friendshipId)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255, 71, 87, 0.1)',
                      color: '#FF4757',
                      border: '1px solid rgba(255, 71, 87, 0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          <h4 style={{
            margin: '0 0 16px 0',
            color: '#E2E8F0',
            fontSize: '1rem'
          }}>
            Incoming Requests
          </h4>
          {pendingRequests.filter(r => !r.isRequester).length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#64748B',
              marginBottom: '24px'
            }}>
              No pending requests
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {pendingRequests.filter(r => !r.isRequester).map((request) => (
                <div
                  key={request.friendshipId}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: '#E2E8F0',
                        marginBottom: '4px'
                      }}>
                        {request.username}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748B'
                      }}>
                        wants to connect
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => acceptFriendRequest(request.friendshipId)}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #00F5FF, #00FF88)',
                          color: '#0F0F23',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeFriend(request.friendshipId)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255, 71, 87, 0.1)',
                          color: '#FF4757',
                          border: '1px solid rgba(255, 71, 87, 0.2)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 style={{
            margin: '0 0 16px 0',
            color: '#E2E8F0',
            fontSize: '1rem'
          }}>
            Sent Requests
          </h4>
          {pendingRequests.filter(r => r.isRequester).length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#64748B'
            }}>
              No pending sent requests
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {pendingRequests.filter(r => r.isRequester).map((request) => (
                <div
                  key={request.friendshipId}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: '#E2E8F0',
                      marginBottom: '4px'
                    }}>
                      {request.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#FFD700'
                    }}>
                      Pending...
                    </div>
                  </div>
                  <button
                    onClick={() => removeFriend(request.friendshipId)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div>
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#E2E8F0',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              style={{
                padding: '12px 24px',
                background: searching ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #00F5FF, #00FF88)',
                color: searching ? '#64748B' : '#0F0F23',
                border: 'none',
                borderRadius: '12px',
                cursor: searching ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {searchResults.map((user) => (
                <div
                  key={user.wallet}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: '#E2E8F0',
                      marginBottom: '4px'
                    }}>
                      {user.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#64748B'
                    }}>
                      {user.wallet.substring(0, 6)}...{user.wallet.substring(38)}
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.wallet)}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #00F5FF, #00FF88)',
                      color: '#0F0F23',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#64748B'
            }}>
              No users found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendSystem;