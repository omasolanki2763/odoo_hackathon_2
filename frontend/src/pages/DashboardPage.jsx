import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DashboardPage = () => {
  const [user, setUser] = useState({
    username: '',
    email: '',
    points: 0,
    joinedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  });

  const [myItems, setMyItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('❌ No token found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        console.log('🔄 Fetching dashboard data with token...');
        
        // Fetch dashboard data from API
        const res = await api.get('/auth/dashboard');
        const dashboardData = res.data.data;
        
        console.log('✅ Dashboard data received:', dashboardData);

        setUser({
          username: dashboardData.user.username,
          email: dashboardData.user.email,
          points: dashboardData.user.points || 0,
          joinedDate: new Date(dashboardData.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        });

        console.log('👤 User data set:', {
          username: dashboardData.user.username,
          email: dashboardData.user.email,
          points: dashboardData.user.points || 0
        });

        setMyItems(dashboardData.recentItems || []);
        setPurchasedItems(dashboardData.purchasedItems || []);
        setSwaps(dashboardData.recentSwaps || []);
        
        console.log('📦 Items count:', dashboardData.recentItems?.length || 0);
        console.log('🔄 Swaps count:', dashboardData.recentSwaps?.length || 0);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Profile Section */}
      <section className="container" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            background: '#2a2f3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            color: '#7dd3fc'
          }}>
            {user.username ? user.username.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.5rem' }}>{user.username || 'Welcome!'}</h2>
            <p style={{ margin: '0 0 0.5rem', color: '#bdbdbd' }}>{user.email || 'No email provided'}</p>
            <p style={{ margin: '0', color: '#bdbdbd' }}>Member since {user.joinedDate}</p>
          </div>
          <div style={{ 
            marginLeft: 'auto', 
            background: '#2a2f3a', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Points Balance</h3>
            <p style={{ 
              margin: '0', 
              fontSize: '2rem', 
              color: '#7dd3fc',
              fontWeight: 'bold'
            }}>{user.points}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="container" style={{ marginBottom: '1rem' }}>
          <div style={{ 
            background: '#f87171', 
            color: '#fff', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        </div>
      )}

      {/* My Items Section */}
      <section className="container" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: '0' }}>My Items</h2>
          <Link to="/add-item" style={{ 
            background: '#7dd3fc', 
            color: '#181a1b', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontWeight: 'bold',
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>Add New Item</Link>
        </div>
        
        {loading ? (
          <p>Loading your items...</p>
        ) : (myItems.length > 0 || purchasedItems.length > 0) ? (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {/* Listed Items */}
            {myItems.map(item => (
              <div key={item._id} style={{ 
                background: '#2a2f3a',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #3a3f4a'
              }}>
                <img 
                  src={item.images && item.images.length > 0 ? item.images[0].url : '/placeholder-image.jpg'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: '#3a3f4a',
                      color: '#bdbdbd'
                    }}>
                      Listed
                    </span>
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: item.status === 'available' ? '#4ade8044' : 
                                item.status === 'pending' ? '#facc1544' : '#f8717144',
                      color: item.status === 'available' ? '#4ade80' : 
                             item.status === 'pending' ? '#facc15' : '#f87171'
                    }}>
                      {item.status}
                    </span>
                  </div>
                  <Link to={`/items/${item._id}`} style={{ 
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    color: '#7dd3fc',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}>Manage →</Link>
                </div>
              </div>
            ))}
            
            {/* Purchased Items */}
            {purchasedItems.map(item => (
              <div key={item._id} style={{ 
                background: '#2a2f3a',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #4ade80'
              }}>
                <img 
                  src={item.images && item.images.length > 0 ? item.images[0].url : '/placeholder-image.jpg'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: '#4ade8044',
                      color: '#4ade80'
                    }}>
                      Purchased
                    </span>
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: '#4ade8044',
                      color: '#4ade80'
                    }}>
                      {item.pointsSpent} points
                    </span>
                  </div>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: '#bdbdbd' }}>
                    {new Date(item.purchasedAt).toLocaleDateString()}
                  </p>
                  <Link to={`/items/${item._id}`} style={{ 
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    color: '#7dd3fc',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}>View Details →</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            background: '#2a2f3a', 
            borderRadius: '8px', 
            padding: '2rem',
            textAlign: 'center'
          }}>
            <p style={{ marginBottom: '1rem' }}>You haven't listed or purchased any items yet.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/add-item" style={{ 
                background: '#7dd3fc', 
                color: '#181a1b', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}>Add Your First Item</Link>
              <Link to="/items" style={{ 
                background: '#3a3f4a', 
                color: '#fff', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}>Browse Items</Link>
            </div>
          </div>
        )}
      </section>

      {/* Incoming Swap Requests */}
      <section className="container">
        <h2>Incoming Swap Requests</h2>
        
        {loading ? (
          <p>Loading incoming requests...</p>
        ) : swaps.filter(swap => 
          swap.itemOwnerId?._id === user._id && swap.status === 'pending'
        ).length > 0 ? (
          <div style={{ 
            background: '#2a2f3a',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '2rem'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3f4a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Requested By</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {swaps.filter(swap => 
                  swap.itemOwnerId?._id === user._id && swap.status === 'pending'
                ).map(swap => (
                  <tr key={swap._id} style={{ borderBottom: '1px solid #3a3f4a' }}>
                    <td style={{ padding: '1rem' }}>{swap.itemId?.title || 'Unknown Item'}</td>
                    <td style={{ padding: '1rem' }}>{swap.requesterId?.username || 'Unknown'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: swap.type === 'redeem' ? '#facc1544' : '#7dd3fc44',
                        color: swap.type === 'redeem' ? '#facc15' : '#7dd3fc'
                      }}>
                        {swap.type === 'redeem' ? 'Redeem' : 'Swap'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(swap.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/swaps/${swap._id}`} style={{ 
                        color: '#4ade80',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>Respond Now</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            background: '#2a2f3a', 
            borderRadius: '8px', 
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <p>No pending swap requests.</p>
          </div>
        )}
      </section>

      {/* All My Swaps */}
      <section className="container">
        <h2>All My Swaps</h2>
        
        {loading ? (
          <p>Loading your swaps...</p>
        ) : swaps.length > 0 ? (
          <div style={{ 
            background: '#2a2f3a',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3f4a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>With</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {swaps.map(swap => (
                  <tr key={swap._id} style={{ borderBottom: '1px solid #3a3f4a' }}>
                    <td style={{ padding: '1rem' }}>{swap.itemId?.title || 'Unknown Item'}</td>
                    <td style={{ padding: '1rem' }}>
                      {swap.requesterId?._id === user._id 
                        ? swap.itemOwnerId?.username || 'Unknown'
                        : swap.requesterId?.username || 'Unknown'
                      }
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: swap.type === 'redeem' ? '#facc1544' : '#7dd3fc44',
                        color: swap.type === 'redeem' ? '#facc15' : '#7dd3fc'
                      }}>
                        {swap.type === 'redeem' ? 'Redeem' : 'Swap'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(swap.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: swap.status === 'accepted' ? '#4ade8044' : 
                                  swap.status === 'pending' ? '#facc1544' : '#f8717144',
                        color: swap.status === 'accepted' ? '#4ade80' : 
                               swap.status === 'pending' ? '#facc15' : '#f87171'
                      }}>
                        {swap.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/swaps/${swap._id}`} style={{ 
                        color: '#7dd3fc',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                      }}>View Details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            background: '#2a2f3a', 
            borderRadius: '8px', 
            padding: '2rem',
            textAlign: 'center'
          }}>
            <p>No swaps yet. Start by browsing items or adding your own!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage; 