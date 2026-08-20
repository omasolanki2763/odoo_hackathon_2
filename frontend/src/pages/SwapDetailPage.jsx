import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

const SwapDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [swap, setSwap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchSwap = async () => {
      try {
        const response = await api.get(`/swaps/${id}`);
        setSwap(response.data.data);
      } catch (err) {
        console.error('Error fetching swap:', err);
        setError(err.response?.data?.message || 'Failed to load swap details');
      } finally {
        setLoading(false);
      }
    };

    fetchSwap();
  }, [id]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await api.put(`/swaps/${id}/accept`);
      // Refresh swap data
      const response = await api.get(`/swaps/${id}`);
      setSwap(response.data.data);
      alert('Swap accepted successfully!');
    } catch (err) {
      console.error('Error accepting swap:', err);
      setError(err.response?.data?.message || 'Failed to accept swap');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/swaps/${id}/reject`, { reason: rejectionReason });
      // Refresh swap data
      const response = await api.get(`/swaps/${id}`);
      setSwap(response.data.data);
      setShowRejectModal(false);
      setRejectionReason('');
      alert('Swap rejected successfully!');
    } catch (err) {
      console.error('Error rejecting swap:', err);
      setError(err.response?.data?.message || 'Failed to reject swap');
    } finally {
      setActionLoading(false);
    }
  };

  const canRespond = swap && swap.status === 'pending' && swap.itemOwnerId?._id === JSON.parse(localStorage.getItem('userData') || '{}')._id;

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading swap details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#f87171' }}>{error}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            background: '#7dd3fc',
            color: '#181a1b',
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

  if (!swap) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Swap not found</p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            background: '#7dd3fc',
            color: '#181a1b',
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
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ 
        background: '#2a2f3a',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#f8fafc' }}>Swap Details</h1>
          <Link 
            to="/dashboard"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: '#3a3f4a',
              color: '#f8fafc',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Status Badge */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ 
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: swap.status === 'accepted' ? '#4ade8044' : 
                      swap.status === 'pending' ? '#facc1544' : 
                      swap.status === 'rejected' ? '#f8717144' : '#6b728044',
            color: swap.status === 'accepted' ? '#4ade80' : 
                   swap.status === 'pending' ? '#facc15' : 
                   swap.status === 'rejected' ? '#f87171' : '#6b7280'
          }}>
            {swap.status.toUpperCase()}
          </span>
        </div>

        {/* Item Being Requested */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Item Being Requested</h3>
          <div style={{ 
            background: '#3a3f4a',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            {swap.itemId?.images?.[0] && (
              <img 
                src={swap.itemId.images[0].url} 
                alt={swap.itemId.title}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            )}
            <div>
              <h4 style={{ color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
                {swap.itemId?.title || 'Unknown Item'}
              </h4>
              <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
                {swap.itemId?.description || 'No description available'}
              </p>
              {swap.type === 'redeem' && (
                <p style={{ color: '#facc15', margin: '0.5rem 0 0 0', fontWeight: 'bold' }}>
                  Points Offered: {swap.pointsOffered}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Item Being Offered (for swaps) */}
        {swap.type === 'swap' && swap.requestedItemId && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Item Being Offered</h3>
            <div style={{ 
              background: '#3a3f4a',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              {swap.requestedItemId?.images?.[0] && (
                              <img 
                src={swap.requestedItemId.images[0].url} 
                alt={swap.requestedItemId.title}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
              )}
              <div>
                <h4 style={{ color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
                  {swap.requestedItemId?.title || 'Unknown Item'}
                </h4>
                <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
                  {swap.requestedItemId?.description || 'No description available'}
                </p>
                <p style={{ color: '#7dd3fc', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Offered by: {swap.requesterId?.username || 'Unknown User'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Details */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>
            {swap.requesterId?._id === JSON.parse(localStorage.getItem('userData') || '{}')._id 
              ? 'You are requesting this item from'
              : 'Request from'
            }
          </h3>
          <div style={{ 
            background: '#3a3f4a',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <p style={{ color: '#f8fafc', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
              {swap.requesterId?.username || 'Unknown User'}
            </p>
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
              Requested on: {new Date(swap.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Message */}
        {swap.message && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Message</h3>
            <div style={{ 
              background: '#3a3f4a',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <p style={{ color: '#f8fafc', margin: 0 }}>{swap.message}</p>
            </div>
          </div>
        )}

        {/* Response */}
        {swap.response && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Response</h3>
            <div style={{ 
              background: '#3a3f4a',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <p style={{ color: '#f8fafc', margin: '0 0 0.5rem 0' }}>{swap.response.message}</p>
              <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
                Responded on: {new Date(swap.response.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid #3a3f4a'
          }}>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: '#4ade80',
                color: '#181a1b',
                fontWeight: 'bold',
                border: 'none',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              {actionLoading ? 'Accepting...' : 'Accept Swap'}
            </button>
            
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: '#f87171',
                color: '#181a1b',
                fontWeight: 'bold',
                border: 'none',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Swap'}
            </button>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a2f3a',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Reject Swap</h3>
            <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
              Please provide a reason for rejecting this swap request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #3a3f4a',
                background: '#1a1f2a',
                color: '#f8fafc',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: '0.5rem 1rem',
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
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: '#f87171',
                  color: '#fff',
                  border: 'none',
                  cursor: actionLoading || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: actionLoading || !rejectionReason.trim() ? 0.6 : 1
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Swap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapDetailPage; 