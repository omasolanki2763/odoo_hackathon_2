import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { hasEnoughPoints } from '../utils/pointsSystem';

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [insufficientPoints, setInsufficientPoints] = useState(false);

  useEffect(() => {
    const fetchItemAndUser = async () => {
      try {
        console.log('🔄 Fetching item details for ID:', id);
        
        // Fetch item details from API
        const itemRes = await api.get(`/items/${id}`);
        const itemData = itemRes.data.data;
        
        console.log('✅ Item details received:', itemData);
        
        // Check if user is authenticated before fetching profile
        const token = localStorage.getItem('token');
        if (token) {
          try {
            console.log('🔄 Fetching user profile with token...');
            const userRes = await api.get('/auth/profile');
            const userData = userRes.data.data;
            console.log('✅ User profile received:', userData);
            setUserPoints(userData.points || 0);
          } catch (profileErr) {
            console.error('❌ Error fetching user profile:', profileErr);
            // Don't fail the entire request if profile fetch fails
            // Clear invalid token
            if (profileErr.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('userData');
            }
          }
        } else {
          console.log('ℹ️ No token found, skipping user profile fetch');
        }
        
        setItem(itemData);
      } catch (err) {
        console.error('Error fetching item:', err);
        setError(err.response?.data?.message || 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItemAndUser();
  }, [id]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [selectedSwapItem, setSelectedSwapItem] = useState(null);
  const [swapMessage, setSwapMessage] = useState('');

  const handleSwapRequest = async () => {
    try {
      // Get user's items from dashboard endpoint since that shows all items
      console.log('🔄 Fetching user items from dashboard...');
      const dashboardRes = await api.get('/auth/dashboard');
      console.log('✅ Dashboard response:', dashboardRes.data);
      
      const allUserItems = dashboardRes.data.data?.recentItems || [];
      console.log('📦 Raw items from dashboard:', allUserItems);
      console.log('📊 Dashboard items count:', allUserItems.length);
      
      // Filter for items that can be used for swapping
      // Include: available, approved, pending (user's own items), and redeemed items
      const availableItems = allUserItems.filter(item => 
        item.status === 'available' || 
        item.status === 'approved' || 
        item.status === 'pending' || 
        item.status === 'redeemed'
      );
      
      console.log('🔄 All user items:', allUserItems);
      console.log('🔄 User items fetched:', availableItems);
      console.log('📊 Total items found:', availableItems.length);
      console.log('📊 Item statuses:', allUserItems.map(item => ({ title: item.title, status: item.status })));
      
      // Debug each item individually
      allUserItems.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          title: item.title,
          status: item.status,
          category: item.category,
          userId: item.userId,
          _id: item._id
        });
      });
      
      // Debug filtering logic
      const statuses = ['available', 'approved', 'pending', 'redeemed'];
      allUserItems.forEach(item => {
        const isIncluded = statuses.includes(item.status);
        console.log(`${item.title}: status=${item.status}, included=${isIncluded}`);
      });
      
      // Additional debug: Check if items are being filtered out
      const filteredOutItems = allUserItems.filter(item => !statuses.includes(item.status));
      if (filteredOutItems.length > 0) {
        console.log('❌ Items filtered out:', filteredOutItems.map(item => ({
          title: item.title,
          status: item.status
        })));
      }
      
      setUserItems(availableItems);
      setShowSwapModal(true);
    } catch (err) {
      console.error('Error fetching user items:', err);
      setError('Failed to load your items for swap');
    }
  };

  const handleSwapSubmit = async () => {
    if (!selectedSwapItem) {
      setError('Please select an item to offer in exchange');
      return;
    }

    try {
      const swapData = {
        itemId: item._id,
        requestedItemId: selectedSwapItem._id,
        type: 'swap',
        message: swapMessage || `I would like to swap my "${selectedSwapItem.title}" for your "${item.title}"`
      };
      
      console.log('🔄 Sending swap request with data:', swapData);
      
      await api.post('/swaps', swapData);
      
      setRequestSent(true);
      setShowSwapModal(false);
      setSelectedSwapItem(null);
      setSwapMessage('');
      
      // Update user points (4 points deducted)
      setUserPoints(prev => prev - 4);
      
      // Show success message
      setError(''); // Clear any previous errors
      setTimeout(() => {
        setRequestSent(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending swap request:', err);
      console.log('🔍 Full error response:', err.response?.data);
      
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(error => 
          `${error.field}: ${error.message}`
        ).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Failed to send swap request');
      }
    }
  };

  const handleRedeem = async () => {
    // Check if user has enough points
    if (!hasEnoughPoints(item.pointsValue || 50)) {
      setInsufficientPoints(true);
      setTimeout(() => setInsufficientPoints(false), 3000);
      return;
    }
    
    try {
      // Create redemption through API
      const redeemData = {
        itemId: item._id,
        pointsOffered: item.pointsValue || 50
      };
      
      console.log('🔄 Sending direct redeem request with data:', redeemData);
      console.log('📦 Item status:', item.status);
      console.log('💰 Item points value:', item.pointsValue);
      console.log('👤 Current user points:', userPoints);
      console.log('✅ Item is available for redemption:', item.status === 'available' || item.status === 'approved');
      
      const response = await api.post('/swaps/redeem/direct', redeemData);
      
      console.log('✅ Direct redemption response:', response.data);
      
      // Update local state with the response data
      if (response.data.data) {
        setItem(response.data.data.item);
        setUserPoints(response.data.data.user.points);
      }
      
      setRedeemed(true);
      setRedemptionSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setRedemptionSuccess(false), 3000);
    } catch (err) {
      console.error('Error redeeming item:', err);
      console.log('🔍 Full error response:', err.response?.data);
      
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(error => 
          `${error.field}: ${error.message}`
        ).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Failed to redeem item');
      }
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#f87171' }}>{error || 'Item not found'}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ 
            background: '#7dd3fc', 
            color: '#181a1b', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      {redemptionSuccess && (
        <div style={{ 
          padding: '1rem', 
          background: '#4ade8044', 
          color: '#4ade80',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '1rem',
          animation: 'fadeIn 0.5s'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            Item redeemed successfully! {item.pointsValue || 50} points have been deducted from your balance.
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            The item is now yours!
          </p>
        </div>
      )}
      
      {insufficientPoints && (
        <div style={{ 
          padding: '1rem', 
          background: '#f8717144', 
          color: '#f87171',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '1rem',
          animation: 'fadeIn 0.5s'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            Insufficient points! You need {item.pointsValue || 50} points to redeem this item.
          </p>
        </div>
      )}
      
      {requestSent && (
        <div style={{ 
          padding: '1rem', 
          background: '#4ade8044', 
          color: '#4ade80',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '1rem',
          animation: 'fadeIn 0.5s'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            Swap request sent successfully! 4 points have been deducted from your balance.
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Waiting for the item owner to approve your request.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Image Gallery */}
        <div>
          <div style={{ 
            width: '100%', 
            height: '400px', 
            borderRadius: '8px', 
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <img 
              src={item.images && item.images.length > 0 ? item.images[selectedImage].url : '/placeholder-image.jpg'} 
              alt={item.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          
          {item.images && item.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
              {item.images.map((image, index) => (
                <img 
                  key={index}
                  src={image.url} 
                  alt={`${item.title} ${index + 1}`} 
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'cover',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedImage === index ? '2px solid #7dd3fc' : '2px solid transparent'
                  }}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Item Details */}
        <div>
          <h1 style={{ margin: '0 0 1rem' }}>{item.title}</h1>
          
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ 
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              background: item.status === 'available' ? '#4ade8044' : '#f8717144',
              color: item.status === 'available' ? '#4ade80' : '#f87171'
            }}>
              {item.status}
            </span>
          </div>
          
          <p style={{ margin: '0 0 1rem', color: '#bdbdbd' }}>{item.description}</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Category:</strong> {item.category}<br />
            <strong>Gender:</strong> {item.gender}<br />
            <strong>Size:</strong> {item.size}<br />
            <strong>Condition:</strong> {item.condition}
            {item.brand && <><br /><strong>Brand:</strong> {item.brand}</>}
          </div>
          
          {item.tags && item.tags.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Tags:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {item.tags.map((tag, index) => (
                  <span key={index} style={{ 
                    padding: '0.25rem 0.5rem',
                    background: '#3a3f4a',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Points Value:</strong> {item.pointsValue || 50} points
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Your Points:</strong> {userPoints} points
          </div>
          
          {/* Action Buttons */}
          {(item.status === 'available' || item.status === 'approved') && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSwapRequest}
                disabled={requestSent || userPoints < 4}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  background: userPoints < 4 ? '#6b7280' : '#7dd3fc',
                  color: '#181a1b',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: requestSent || userPoints < 4 ? 'not-allowed' : 'pointer',
                  opacity: requestSent || userPoints < 4 ? 0.6 : 1
                }}
              >
                {requestSent ? 'Request Sent' : userPoints < 4 ? 'Need 4 Points' : 'Request Swap (4 pts)'}
              </button>
              
              <button
                onClick={handleRedeem}
                disabled={redeemed || userPoints < (item.pointsValue || 50) || item.status === 'redeemed'}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  background: redeemed || item.status === 'redeemed' ? '#4ade80' : '#facc15',
                  color: '#181a1b',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: redeemed || userPoints < (item.pointsValue || 50) || item.status === 'redeemed' ? 'not-allowed' : 'pointer',
                  opacity: redeemed || userPoints < (item.pointsValue || 50) || item.status === 'redeemed' ? 0.6 : 1
                }}
              >
                {redeemed || item.status === 'redeemed' ? 'Redeemed' : `Redeem for ${item.pointsValue || 50} points`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Uploader Info */}
      {item.user && (
        <div style={{ 
          background: '#2a2f3a', 
          borderRadius: '8px', 
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>About the Uploader</h3>
          <p style={{ margin: '0', color: '#bdbdbd' }}>
            <strong>Username:</strong> {item.user.username}<br />
            <strong>Member since:</strong> {new Date(item.user.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Swap Modal */}
      {showSwapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a2f3a',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#f8fafc' }}>
              Request Swap for "{item.title}"
            </h3>
            
            <div style={{ 
              background: '#facc1544', 
              border: '1px solid #facc15', 
              borderRadius: '6px', 
              padding: '1rem', 
              marginBottom: '1rem' 
            }}>
              <p style={{ color: '#facc15', margin: '0', fontWeight: 'bold' }}>
                ⚠️ Swap Request Cost: 4 points will be deducted from your balance
              </p>
              <p style={{ color: '#cbd5e1', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                Your current balance: {userPoints} points
              </p>
            </div>
            
            <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
              Select one of your items to offer in exchange:
            </p>

            {/* User's Items */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Your Available Items:</h4>
              {userItems.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>
                  You don't have any available items to swap. Please list some items first!
                </p>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {userItems.map(userItem => (
                    <div 
                      key={userItem._id}
                      onClick={() => setSelectedSwapItem(userItem)}
                      style={{
                        background: selectedSwapItem?._id === userItem._id ? '#7dd3fc44' : '#3a3f4a',
                        border: selectedSwapItem?._id === userItem._id ? '2px solid #7dd3fc' : '2px solid transparent',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {userItem.images && userItem.images.length > 0 && (
                        <img 
                          src={userItem.images[0].url} 
                          alt={userItem.title}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            marginBottom: '0.5rem'
                          }}
                        />
                      )}
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                        {userItem.title}
                      </h5>
                      <p style={{ 
                        margin: '0', 
                        fontSize: '0.9rem', 
                        color: '#cbd5e1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {userItem.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#f8fafc', marginBottom: '0.5rem' }}>
                Message (optional):
              </label>
              <textarea
                value={swapMessage}
                onChange={(e) => setSwapMessage(e.target.value)}
                placeholder="Add a message to your swap request..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #3a3f4a',
                  background: '#1a1f2a',
                  color: '#f8fafc',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setSelectedSwapItem(null);
                  setSwapMessage('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  background: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwapSubmit}
                disabled={!selectedSwapItem}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  background: selectedSwapItem ? '#7dd3fc' : '#6b7280',
                  color: selectedSwapItem ? '#181a1b' : '#fff',
                  border: 'none',
                  cursor: selectedSwapItem ? 'pointer' : 'not-allowed',
                  opacity: selectedSwapItem ? 1 : 0.6
                }}
              >
                Send Swap Request (4 pts)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailPage; 