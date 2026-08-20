import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { awardAddItemPoints, POINTS } from '../utils/pointsSystem';

const AddItemPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    size: '',
    condition: 'good',
    gender: '',
    tags: ''
  });
  
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleImageChange = (e) => {
    e.preventDefault();
    
    const files = Array.from(e.target.files);
    
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    
    const newImages = [...images, ...files];
    setImages(newImages);
    
    // Create preview URLs
    const newImagePreviewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newImagePreviewUrls]);
  };
  
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newImagePreviewUrls = [...imagePreviewUrls];
    URL.revokeObjectURL(newImagePreviewUrls[index]); // Clean up
    newImagePreviewUrls.splice(index, 1);
    setImagePreviewUrls(newImagePreviewUrls);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }
    
    // Client-side validation
    if (!formData.title || formData.title.length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }
    
    if (!formData.category) {
      setError('Please select a category');
      return;
    }
    
    if (!formData.size) {
      setError('Please select a size');
      return;
    }
    
    if (!formData.gender) {
      setError('Please select a gender');
      return;
    }
    
    if (!formData.description || formData.description.length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }
    
    console.log('🔄 Starting item submission...');
    console.log('📸 Images to upload:', images.length);
    
    setLoading(true);
    setError('');
    
    try {
      // Upload images first
      const imageUrls = [];
      for (const image of images) {
        try {
          const formData = new FormData();
          formData.append('image', image);
          
          const uploadRes = await api.post('/upload/single', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          console.log('📤 Upload response:', uploadRes.data);
          imageUrls.push(uploadRes.data.data.url);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          // Fallback: use a placeholder image if upload fails
          imageUrls.push(`https://dummyimage.com/400x400/7dd3fc/181a1b&text=Item+Image`);
        }
      }
      
      // Create the item with uploaded image URLs
      const itemData = {
        ...formData,
        images: imageUrls.map(url => ({ url, isPrimary: false })),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        gender: formData.gender || 'unisex',
        pointsValue: 50, // Default points value
        // Ensure description meets minimum length requirement
        description: formData.description && formData.description.length >= 10 
          ? formData.description 
          : (formData.title + ' - A great item for swapping!')
      };
      
      // Set first image as primary
      if (itemData.images.length > 0) {
        itemData.images[0].isPrimary = true;
      }
      
      console.log('📦 Item data being sent:', itemData);
      console.log('🖼️ Image URLs:', imageUrls);
      
      await api.post('/items', itemData);
      
      // Award points for adding an item
      awardAddItemPoints();
      setPointsAwarded(POINTS.ADD_ITEM);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.log('🔍 Full error response:', err.response?.data);
      
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(error => 
          `${error.field}: ${error.message}`
        ).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Failed to add item. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
  const conditions = ['new', 'like-new', 'good', 'fair', 'worn'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  const genders = ['men', 'women', 'unisex'];
  
  return (
    <div className="container">
      <h2>Add New Item</h2>
      
      {success ? (
        <div style={{ 
          padding: '1rem', 
          background: '#4ade8044', 
          color: '#4ade80',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: '0 0 0.5rem' }}>Item added successfully!</p>
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            You earned {pointsAwarded} points!
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Redirecting to dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Image Upload */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Images (up to 5)
            </label>
            <div style={{ 
              border: '2px dashed #3a3f4a', 
              borderRadius: '8px', 
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="image-upload"
              />
              <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                    <line x1="16" y1="5" x2="22" y2="5"></line>
                    <line x1="19" y1="2" x2="19" y2="8"></line>
                    <circle cx="9" cy="9" r="2"></circle>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                  </svg>
                </div>
                <p style={{ margin: 0 }}>Click to upload images</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#bdbdbd' }}>
                  PNG, JPG, GIF up to 10MB
                </p>
              </label>
            </div>
            
            {imagePreviewUrls.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} 
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#f87171',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Subcategory
              </label>
              <input
                type="text"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                placeholder="e.g., T-shirt, Jeans, Dress"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Size *
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              >
                <option value="">Select size</option>
                {sizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              >
                {conditions.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              >
                <option value="">Select gender</option>
                {genders.map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., vintage, casual, formal (comma separated)"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Describe your item in detail..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff', resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ color: '#f87171', fontWeight: 'bold' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: '#7dd3fc',
              color: '#181a1b',
              fontWeight: 'bold',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Adding Item...' : 'Add Item'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AddItemPage; 