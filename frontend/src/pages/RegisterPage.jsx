import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      console.log('🔄 Sending registration request with data:', { username, email, password: '***', confirmPassword: '***' });
      
      // Make real API call to register
      const response = await api.post('/auth/register', { username, email, password, confirmPassword });
      
      console.log('✅ Registration response:', response.data);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = err.response.data.errors.map(error => error.message).join(', ');
        setError(`Validation errors: ${validationErrors}`);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
        />
        <div style={{ fontSize: '0.8rem', color: '#bdbdbd', marginTop: '-0.5rem' }}>
          Username must be 3-30 characters, letters, numbers, and underscores only
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
        />
        <div style={{ fontSize: '0.8rem', color: '#bdbdbd', marginTop: '-0.5rem' }}>
          Password must be at least 6 characters with uppercase, lowercase, and number
        </div>
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#23272f', color: '#fff' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', borderRadius: '8px', background: '#7dd3fc', color: '#181a1b', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        {error && <div style={{ color: '#f87171', fontWeight: 'bold' }}>{error}</div>}
        {success && <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{success}</div>}
        
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#2a2f3a', 
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Join ReWear!</h3>
          <p style={{ margin: '0 0 0.5rem' }}>
            Start your sustainable fashion journey with ReWear.
          </p>
          <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
            <li>List your unused clothing items</li>
            <li>Browse items from other users</li>
            <li>Swap items directly or use points</li>
            <li>Build a sustainable wardrobe!</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage; 