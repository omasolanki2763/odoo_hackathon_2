import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const LandingPage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFeaturedItems = async () => {
      try {
        console.log('🔄 Fetching featured items...');
        
        // Fetch featured items from API
        const res = await api.get('/items/featured');
        console.log('✅ Featured items data received:', res.data);
        setFeaturedItems(res.data.data || []);
        
        console.log('⭐ Featured items count:', res.data.data?.length || 0);
      } catch (err) {
        console.error('Error fetching featured items:', err);
        setError('Failed to load featured items');
        // Fallback to placeholder data
        setFeaturedItems([
          { _id: 1, title: 'Denim Jacket', images: ['https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=200'], condition: 'Like New' },
          { _id: 2, title: 'Summer Dress', images: ['https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=200'], condition: 'Good' },
          { _id: 3, title: 'Winter Coat', images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=200'], condition: 'Excellent' },
          { _id: 4, title: 'Casual Shirt', images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=200'], condition: 'Very Good' },
          { _id: 5, title: 'Vintage Sweater', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200'], condition: 'Good' },
          { _id: 6, title: 'Designer Jeans', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=200'], condition: 'Excellent' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedItems();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(to right, #1a1a2e, #16213e)', 
        padding: '4rem 2rem',
        textAlign: 'center',
        borderRadius: '0 0 20px 20px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>ReWear: Community Clothing Exchange</h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
          Join our sustainable fashion movement! Exchange your unused clothes through direct swaps or our point-based system.
          Reduce waste, refresh your wardrobe, and make a positive impact on the environment.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ 
            background: '#7dd3fc', 
            color: '#181a1b', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px',
            fontWeight: 'bold',
            textDecoration: 'none'
          }}>Start Swapping</Link>
          <Link to="/items" style={{ 
            background: 'transparent', 
            color: '#7dd3fc', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px',
            border: '2px solid #7dd3fc',
            fontWeight: 'bold',
            textDecoration: 'none'
          }}>Browse Items</Link>
          <Link to="/add-item" style={{ 
            background: 'transparent', 
            color: '#7dd3fc', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px',
            border: '2px solid #7dd3fc',
            fontWeight: 'bold',
            textDecoration: 'none'
          }}>List an Item</Link>
        </div>
      </section>

      {/* Featured Items Section */}
      <section className="container" style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Featured Items</h2>
          {featuredItems.length > 6 && (
            <span style={{ color: '#7dd3fc', fontSize: '0.9rem' }}>
              Scroll to see more →
            </span>
          )}
        </div>
        
        {error && (
          <div style={{ 
            background: '#f87171', 
            color: '#fff', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        
        {loading ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            padding: '1rem 0'
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ 
                background: '#2a2f3a',
                borderRadius: '8px',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7dd3fc'
              }}>
                Loading...
              </div>
            ))}
          </div>
        ) : featuredItems.length > 0 ? (
          <div className="scroll-container" style={{ padding: '1rem 0 2rem' }}>
            {featuredItems.map((item) => (
              <div key={item._id} className="scroll-item" style={{ 
                minWidth: '250px',
                maxWidth: '300px',
                background: '#2a2f3a',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <img 
                  src={item.images && item.images.length > 0 ? item.images[0].url : '/placeholder-image.jpg'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                  <p style={{ margin: '0', color: '#bdbdbd', fontSize: '0.9rem' }}>Condition: {item.condition}</p>
                  {item.pointsValue && (
                    <p style={{ margin: '0.5rem 0 0', color: '#7dd3fc', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {item.pointsValue} points
                    </p>
                  )}
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
            <p>No items available yet. Be the first to list one!</p>
            <Link to="/add-item" style={{ 
              background: '#7dd3fc', 
              color: '#181a1b', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '1rem'
            }}>Add Your First Item</Link>
          </div>
        )}
        
        {/* Scroll indicator for mobile */}
        {featuredItems.length > 4 && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1rem',
            color: '#7dd3fc',
            fontSize: '0.8rem'
          }}>
            <span>← Swipe to see more items →</span>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="container" style={{ marginTop: '2rem' }}>
        <h2>How It Works</h2>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h3>1. List Your Items</h3>
            <p>Upload photos and details of clothing items you no longer wear.</p>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h3>2. Browse & Choose</h3>
            <p>Find items you like or wait for swap requests from other users.</p>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h3>3. Swap or Redeem</h3>
            <p>Exchange directly or use points to get items without an immediate swap.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 