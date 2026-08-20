import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    search: ''
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.condition) params.append('condition', filters.condition);
        if (filters.search) params.append('search', filters.search);

        console.log('🔄 Fetching items with params:', params.toString());
        
        const res = await api.get(`/items?${params.toString()}`);
        console.log('✅ Items data received:', res.data);
        setItems(res.data.data || []);
        
        console.log('📦 Items count:', res.data.data?.length || 0);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const categories = ['Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Accessories', 'Footwear', 'Other'];
  const conditions = ['New with tags', 'Like new', 'Excellent', 'Good', 'Fair', 'Poor'];

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading items...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Browse Items</h2>
      
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

      {/* Filters */}
      <div style={{ 
        background: '#2a2f3a', 
        borderRadius: '8px', 
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem' }}>Filters</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #333', 
                background: '#23272f', 
                color: '#fff',
                width: '200px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #333', 
                background: '#23272f', 
                color: '#fff',
                width: '150px'
              }}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Condition
            </label>
            <select
              value={filters.condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #333', 
                background: '#23272f', 
                color: '#fff',
                width: '150px'
              }}
            >
              <option value="">All Conditions</option>
              {conditions.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={() => setFilters({ category: '', condition: '', search: '' })}
              style={{ 
                background: 'transparent', 
                border: '1px solid #7dd3fc', 
                color: '#7dd3fc', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {items.length > 0 ? (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          {items.map(item => (
            <div key={item._id} style={{ 
              background: '#2a2f3a',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <Link to={`/items/${item._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img 
                  src={item.images && item.images.length > 0 ? item.images[0].url : '/placeholder-image.jpg'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                  <p style={{ 
                    margin: '0 0 0.5rem', 
                    color: '#bdbdbd',
                    fontSize: '0.9rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      background: '#3a3f4a',
                      color: '#fff'
                    }}>
                      {item.condition}
                    </span>
                    <span style={{ 
                      color: '#7dd3fc',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {item.pointsValue || 50} points
                    </span>
                  </div>
                  {item.user && (
                    <p style={{ 
                      margin: '0.5rem 0 0', 
                      fontSize: '0.8rem', 
                      color: '#bdbdbd' 
                    }}>
                      by {item.user.username}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          background: '#2a2f3a', 
          borderRadius: '8px', 
          padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            {filters.search || filters.category || filters.condition 
              ? 'No items match your filters.' 
              : 'No items available yet.'
            }
          </p>
          {(filters.search || filters.category || filters.condition) && (
            <button
              onClick={() => setFilters({ category: '', condition: '', search: '' })}
              style={{ 
                background: '#7dd3fc', 
                color: '#181a1b', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemsPage; 