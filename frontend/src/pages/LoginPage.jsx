import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Sending login request with email:', email);
      
      // Make real API call to login
      const res = await api.post('/auth/login', { email, password });
      
      console.log('✅ Login response:', res.data);
      
      // Store token and user data
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('userData', JSON.stringify(res.data.data.user));
      
      console.log('💾 Stored user data:', res.data.data.user);
      
      // Trigger navbar update by dispatching a custom event
      window.dispatchEvent(new Event('auth-change'));
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = err.response.data.errors.map(error => error.message).join(', ');
        setError(`Validation errors: ${validationErrors}`);
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', borderRadius: '8px', background: '#7dd3fc', color: '#181a1b', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: '#f87171', fontWeight: 'bold' }}>{error}</div>}
      </form>
    </div>
  );
};

export default LoginPage; 