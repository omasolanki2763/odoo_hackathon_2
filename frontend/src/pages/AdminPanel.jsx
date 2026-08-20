import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [adminActions, setAdminActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemView, setItemView] = useState('pending'); // pending, all, spam
  const [selectedItems, setSelectedItems] = useState([]);
  
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('❌ No token found, redirecting to login');
          window.location.href = '/login';
          return;
        }
        
        console.log('🔄 Checking admin status with token...');
        
        // Check if current user is admin
        try {
          const userRes = await api.get('/auth/profile');
          const userData = userRes.data.data;
          
          console.log('✅ User profile received:', userData);
          
          if (!userData.isAdmin) {
            console.log('❌ User is not admin, redirecting...');
            window.location.href = '/dashboard';
            return;
          }
        } catch (profileErr) {
          console.error('❌ Error fetching user profile:', profileErr);
          if (profileErr.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = '/login';
            return;
          }
          throw profileErr;
        }
        
        console.log('✅ User is admin, fetching admin data...');
        
        // Fetch admin data based on active tab
        await fetchDataForTab(activeTab);
        
        // Also fetch pending items to check if we need to show alerts
        if (activeTab !== 'listings') {
          try {
            const pendingRes = await api.get('/admin/items/pending');
            const pendingItemsData = pendingRes.data.data?.items || [];
            setPendingItems(pendingItemsData);
            
            // Auto-switch to listings if there are pending items
            if (pendingItemsData.length > 0) {
              console.log('🔄 Auto-switching to listings tab due to pending items');
              setActiveTab('listings');
              showNotification(`You have ${pendingItemsData.length} pending item(s) to review!`, 'info');
            }
          } catch (err) {
            console.error('Error fetching pending items:', err);
          }
        }
        
      } catch (err) {
        console.error('Error fetching admin data:', err);
        if (err.response?.status === 403) {
          window.location.href = '/dashboard';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [activeTab, itemView]);

  const fetchDataForTab = useCallback(async (tab) => {
    try {
      switch (tab) {
        case 'dashboard': {
          const [statsRes, actionsRes] = await Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/actions?limit=5')
          ]);
          setSystemStats(statsRes.data.data || {});
          setAdminActions(actionsRes.data.data || []);
          break;
        }
        case 'users': {
          const usersRes = await api.get('/admin/users');
          setUsers(usersRes.data.data?.users || []);
          break;
        }
        case 'listings': {
          if (itemView === 'pending') {
            console.log('🔄 Fetching pending items...');
            const itemsRes = await api.get('/admin/items/pending');
            console.log('✅ Pending items response:', itemsRes.data);
            const pendingItemsData = itemsRes.data.data?.items || [];
            setPendingItems(pendingItemsData);
            
            // Auto-switch to listings tab if there are pending items and we haven't checked yet
            if (pendingItemsData.length > 0 && activeTab === 'dashboard') {
              console.log('🔄 Auto-switching to listings tab due to pending items');
              setActiveTab('listings');
              showNotification(`You have ${pendingItemsData.length} pending item(s) to review!`, 'info');
            }
          } else {
            console.log('🔄 Fetching all items...');
            const itemsRes = await api.get('/admin/items');
            console.log('✅ All items response:', itemsRes.data);
            setAllItems(itemsRes.data.data?.items || []);
          }
          break;
        }
        case 'swaps': {
          const swapsRes = await api.get('/admin/swaps');
          setSwaps(swapsRes.data.data?.swaps || []);
          break;
        }
      }
    } catch (err) {
      console.error(`Error fetching ${tab} data:`, err);
    }
  }, [activeTab, itemView]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000); // Longer timeout for info notifications
  };
  
  // Item moderation actions
  const handleItemAction = async (itemId, action, reason = '') => {
    try {
      if (action === 'approve') {
        await api.put(`/admin/items/${itemId}/approve`);
        showNotification('Item approved successfully');
      } else if (action === 'reject') {
        await api.put(`/admin/items/${itemId}/reject`, { reason });
        showNotification('Item rejected successfully');
      } else if (action === 'delete') {
        await api.delete(`/admin/items/${itemId}`);
        showNotification('Item deleted successfully');
      }
      
      // Refresh items
      await fetchDataForTab('listings');
    } catch (err) {
      console.error('Error updating item:', err);
      showNotification(err.response?.data?.message || 'Failed to update item', 'error');
    }
  };

  // Bulk item actions
  const handleBulkItemAction = async (action, reason = '') => {
    try {
      if (selectedItems.length === 0) {
        showNotification('Please select items first', 'error');
        return;
      }

      const promises = selectedItems.map(itemId => 
        handleItemAction(itemId, action, reason)
      );
      
      await Promise.all(promises);
      setSelectedItems([]);
      showNotification(`${selectedItems.length} items ${action}ed successfully`);
    } catch (err) {
      console.error('Error with bulk action:', err);
      showNotification('Failed to perform bulk action', 'error');
    }
  };

  // User management actions
  const handleUserAction = async (userId, action, reason = '') => {
    try {
      console.log(`🔄 Admin action: ${action} for user ${userId}`);
      
      if (action === 'activate') {
        await api.put(`/admin/users/${userId}/activate`, { reason });
        showNotification('User activated successfully');
      } else if (action === 'suspend') {
        await api.put(`/admin/users/${userId}/suspend`, { reason });
        showNotification('User suspended successfully');
      } else if (action === 'ban') {
        await api.put(`/admin/users/${userId}/ban`, { reason });
        showNotification('User banned successfully');
      }
      
      console.log(`✅ Admin action ${action} completed successfully`);
      
      // Refresh users
      await fetchDataForTab('users');
    } catch (err) {
      console.error('Error updating user:', err);
      console.log('🔍 Full error response:', err.response?.data);
      showNotification(err.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  // Points management
  const handlePointsAction = async (userId, action, amount, reason) => {
    try {
      if (action === 'bonus') {
        await api.post(`/admin/users/${userId}/points/bonus`, { amount, reason });
        showNotification(`${amount} bonus points awarded successfully`);
      } else if (action === 'penalty') {
        await api.post(`/admin/users/${userId}/points/penalty`, { amount, reason });
        showNotification(`${amount} penalty points applied successfully`);
      }
      
      // Refresh users
      await fetchDataForTab('users');
    } catch (err) {
      console.error('Error updating points:', err);
      showNotification(err.response?.data?.message || 'Failed to update points', 'error');
    }
  };

  // Handle item selection for bulk actions
  const handleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const currentItems = itemView === 'pending' ? pendingItems : allItems;
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map(item => item._id));
    }
  };
  
  if (loading) {
    return (
      <div className="container">
        <h2>Admin Panel</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container">
      <h2>Admin Panel</h2>
      
      {/* Notification */}
      {notification.show && (
        <div style={{ 
          padding: '1rem', 
          background: notification.type === 'success' ? '#4ade8044' : '#f8717144', 
          color: notification.type === 'success' ? '#4ade80' : '#f87171',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{notification.message}</p>
        </div>
      )}
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #3a3f4a',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{ 
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'dashboard' ? '2px solid #7dd3fc' : '2px solid transparent',
            color: activeTab === 'dashboard' ? '#7dd3fc' : '#fff',
            cursor: 'pointer',
            fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal'
          }}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('listings')}
          style={{ 
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'listings' ? '2px solid #7dd3fc' : '2px solid transparent',
            color: activeTab === 'listings' ? '#7dd3fc' : '#fff',
            cursor: 'pointer',
            fontWeight: activeTab === 'listings' ? 'bold' : 'normal'
          }}
        >
          Item Management ({itemView === 'pending' ? pendingItems.length : allItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid #7dd3fc' : '2px solid transparent',
            color: activeTab === 'users' ? '#7dd3fc' : '#fff',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal'
          }}
        >
          Manage Users
        </button>
        <button 
          onClick={() => setActiveTab('swaps')}
          style={{ 
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'swaps' ? '2px solid #7dd3fc' : '2px solid transparent',
            color: activeTab === 'swaps' ? '#7dd3fc' : '#fff',
            cursor: 'pointer',
            fontWeight: activeTab === 'swaps' ? 'bold' : 'normal'
          }}
        >
          Manage Swaps
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          <h3>System Overview</h3>
          
          {/* Pending Items Alert */}
          {pendingItems.length > 0 && (
            <div style={{ 
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>⚠️ Action Required:</strong> You have {pendingItems.length} item(s) pending review
              </div>
              <button 
                onClick={() => setActiveTab('listings')}
                style={{ 
                  background: '#f59e0b',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Review Now
              </button>
            </div>
          )}
          
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              background: '#2a2f3a', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #3a3f4a'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7dd3fc' }}>Users</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{systemStats.users?.total || 0}</div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                Active: {systemStats.users?.active || 0} | 
                Suspended: {systemStats.users?.suspended || 0} | 
                Banned: {systemStats.users?.banned || 0}
              </div>
            </div>
            
            <div style={{ 
              background: '#2a2f3a', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #3a3f4a'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7dd3fc' }}>Items</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{systemStats.items?.total || 0}</div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                Available: {systemStats.items?.available || 0} | 
                Pending: {systemStats.items?.pending || 0}
              </div>
            </div>
            
            <div style={{ 
              background: '#2a2f3a', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #3a3f4a'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7dd3fc' }}>Swaps</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{systemStats.swaps?.total || 0}</div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                Completed: {systemStats.swaps?.completed || 0} | 
                Pending: {systemStats.swaps?.pending || 0}
              </div>
            </div>
          </div>

          {/* Recent Admin Actions */}
          <div>
            <h4>Recent Admin Actions</h4>
            <div style={{ 
              background: '#2a2f3a',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {adminActions.length > 0 ? (
                <div style={{ padding: '1rem' }}>
                  {adminActions.map(action => (
                    <div key={action._id} style={{ 
                      padding: '0.75rem',
                      borderBottom: '1px solid #3a3f4a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {action.adminId?.username || 'Admin'} - {action.action}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                          {action.reason}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {new Date(action.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>
                  No recent admin actions
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Listings Tab */}
      {activeTab === 'listings' && (
        <div>
          <h3>Item Management</h3>
          
          {/* Item View Toggle */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setItemView('pending')}
              style={{ 
                padding: '0.5rem 1rem',
                background: itemView === 'pending' ? '#7dd3fc' : 'transparent',
                color: itemView === 'pending' ? '#181a1b' : '#fff',
                border: '1px solid #3a3f4a',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Pending Review ({pendingItems.length})
            </button>
            <button 
              onClick={() => setItemView('all')}
              style={{ 
                padding: '0.5rem 1rem',
                background: itemView === 'all' ? '#7dd3fc' : 'transparent',
                color: itemView === 'all' ? '#181a1b' : '#fff',
                border: '1px solid #3a3f4a',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              All Items ({allItems.length})
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div style={{ 
              background: '#2a2f3a',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{ color: '#9ca3af' }}>
                {selectedItems.length} item(s) selected
              </span>
              <button 
                onClick={() => handleBulkItemAction('approve')}
                style={{ 
                  background: '#4ade80', 
                  color: '#fff', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Approve All
              </button>
              <button 
                onClick={() => handleBulkItemAction('reject')}
                style={{ 
                  background: '#facc15', 
                  color: '#181a1b', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Reject All
              </button>
              <button 
                onClick={() => handleBulkItemAction('delete')}
                style={{ 
                  background: '#f87171', 
                  color: '#fff', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Delete All
              </button>
            </div>
          )}

          {/* Items List */}
          {itemView === 'pending' ? (
            pendingItems.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: '#2a2f3a',
                borderRadius: '8px',
                color: '#9ca3af'
              }}>
                <p>No pending items to review</p>
              </div>
            ) : (
              <div style={{ 
                background: '#2a2f3a',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Select All */}
                <div style={{ 
                  padding: '1rem',
                  borderBottom: '1px solid #3a3f4a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.length === pendingItems.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Select All</span>
                </div>

                {pendingItems.map(item => (
                  <div key={item._id} style={{ 
                    padding: '1.5rem',
                    borderBottom: '1px solid #3a3f4a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleItemSelection(item._id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h4>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af' }}>
                          {item.description?.substring(0, 100)}...
                        </p>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          <span>By: {item.userId?.username || 'Unknown'}</span> | 
                          <span> Category: {item.category}</span> | 
                          <span> Condition: {item.condition}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleItemAction(item._id, 'approve')}
                        style={{ 
                          background: '#4ade80', 
                          color: '#fff', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setShowItemModal(true);
                        }}
                        style={{ 
                          background: '#f87171', 
                          color: '#fff', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleItemAction(item._id, 'delete')}
                        style={{ 
                          background: '#ef4444', 
                          color: '#fff', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // All Items View
            allItems.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: '#2a2f3a',
                borderRadius: '8px',
                color: '#9ca3af'
              }}>
                <p>No items found</p>
              </div>
            ) : (
              <div style={{ 
                background: '#2a2f3a',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Select All */}
                <div style={{ 
                  padding: '1rem',
                  borderBottom: '1px solid #3a3f4a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.length === allItems.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Select All</span>
                </div>

                {allItems.map(item => (
                  <div key={item._id} style={{ 
                    padding: '1.5rem',
                    borderBottom: '1px solid #3a3f4a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleItemSelection(item._id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h4>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af' }}>
                          {item.description?.substring(0, 100)}...
                        </p>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          <span>By: {item.userId?.username || 'Unknown'}</span> | 
                          <span> Category: {item.category}</span> | 
                          <span> Status: {item.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {item.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleItemAction(item._id, 'approve')}
                            style={{ 
                              background: '#4ade80', 
                              color: '#fff', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedItem(item);
                              setShowItemModal(true);
                            }}
                            style={{ 
                              background: '#f87171', 
                              color: '#fff', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleItemAction(item._id, 'delete')}
                        style={{ 
                          background: '#ef4444', 
                          color: '#fff', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <h3>User Management</h3>
          <div style={{ 
            background: '#2a2f3a',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3f4a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Points</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id} style={{ borderBottom: '1px solid #3a3f4a' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                        <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>{user.points || 0}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: user.status === 'active' ? '#4ade8044' : 
                                  user.status === 'suspended' ? '#facc1544' : '#f8717144',
                        color: user.status === 'active' ? '#4ade80' : 
                               user.status === 'suspended' ? '#facc15' : '#f87171'
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          style={{ 
                            background: '#7dd3fc', 
                            color: '#181a1b', 
                            padding: '0.5rem 1rem', 
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Manage
                        </button>
                        {user.status === 'active' ? (
                          <button 
                            onClick={() => handleUserAction(user._id, 'suspend')}
                            style={{ 
                              background: '#facc15', 
                              color: '#181a1b', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUserAction(user._id, 'activate')}
                            style={{ 
                              background: '#4ade80', 
                              color: '#fff', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Swaps Tab */}
      {activeTab === 'swaps' && (
        <div>
          <h3>Swap Management</h3>
          <div style={{ 
            background: '#2a2f3a',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3f4a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Requester</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {swaps.map(swap => (
                  <tr key={swap._id} style={{ borderBottom: '1px solid #3a3f4a' }}>
                    <td style={{ padding: '1rem' }}>{swap.itemId?.title || 'Unknown Item'}</td>
                    <td style={{ padding: '1rem' }}>{swap.requesterId?.username || 'Unknown'}</td>
                    <td style={{ padding: '1rem' }}>{swap.itemOwnerId?.username || 'Unknown'}</td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(swap.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: swap.status === 'completed' ? '#4ade8044' : 
                                  swap.status === 'pending' ? '#facc1544' : '#f8717144',
                        color: swap.status === 'completed' ? '#4ade80' : 
                               swap.status === 'pending' ? '#facc15' : '#f87171'
                      }}>
                        {swap.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a2f3a',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>Manage User: {selectedUser.username}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Points:</strong> {selectedUser.points || 0}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <h4>Points Management</h4>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="number"
                  placeholder="Amount"
                  id="pointsAmount"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #3a3f4a', background: '#23272f', color: '#fff' }}
                />
                <input
                  type="text"
                  placeholder="Reason"
                  id="pointsReason"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #3a3f4a', background: '#23272f', color: '#fff', flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const amount = document.getElementById('pointsAmount').value;
                    const reason = document.getElementById('pointsReason').value;
                    if (amount && reason) {
                      handlePointsAction(selectedUser._id, 'bonus', parseInt(amount), reason);
                      setShowUserModal(false);
                    }
                  }}
                  style={{
                    background: '#4ade80',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Award Bonus
                </button>
                <button
                  onClick={() => {
                    const amount = document.getElementById('pointsAmount').value;
                    const reason = document.getElementById('pointsReason').value;
                    if (amount && reason) {
                      handlePointsAction(selectedUser._id, 'penalty', parseInt(amount), reason);
                      setShowUserModal(false);
                    }
                  }}
                  style={{
                    background: '#f87171',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Apply Penalty
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: '#6b7280',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Rejection Modal */}
      {showItemModal && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a2f3a',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3>Reject Item: {selectedItem.title}</h3>
            <p style={{ marginBottom: '1rem' }}>Please provide a reason for rejection:</p>
            <textarea
              placeholder="Reason for rejection..."
              id="rejectionReason"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #3a3f4a',
                background: '#23272f',
                color: '#fff',
                minHeight: '100px',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowItemModal(false)}
                style={{
                  background: '#6b7280',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = document.getElementById('rejectionReason').value;
                  if (reason.trim()) {
                    handleItemAction(selectedItem._id, 'reject', reason);
                    setShowItemModal(false);
                  }
                }}
                style={{
                  background: '#f87171',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reject Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 