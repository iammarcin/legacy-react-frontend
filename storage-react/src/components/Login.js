// Login.js
import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { triggerAPIRequest, extractResponseData } from '../services/api.methods';
import { getCustomerId, setAuthTokenForBackend, setCustomerId } from '../utils/configuration';
import './css/Login.css';


const Login = ({ onLoginSuccess }) => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const getSettings = useSettings();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const storedCustomerId = getCustomerId() || 1;
      const userInput = { "username": user, "password": password, "customer_id": storedCustomerId };

      const response = await triggerAPIRequest("api/db", "provider.db", "db_auth_user", userInput, getSettings);

      if (response.success) {
        const result = extractResponseData(response) || {};
        const token = result.token || '';
        const customerId = result.customer_id ?? result.customerId ?? storedCustomerId;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 90);

        localStorage.setItem('authToken', JSON.stringify({
          token,
          expiration: expirationDate.toISOString(),
        }));

        if (token) {
          setAuthTokenForBackend(token);
        }

        if (customerId) {
          setCustomerId(customerId);
        }

        onLoginSuccess();
      } else {
        const extracted = extractResponseData(response);
        const message = typeof extracted === 'string'
          ? extracted
          : response.message || 'Invalid username or password';
        setError(message);
      }
    } catch (error) {
      console.error('Failed to authenticate', error);
      setError('Failed to authenticate');
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
