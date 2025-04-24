import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (endpoint, method = 'GET', body = null) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        config.data = body;
      }

      const response = await axios(config);
      setData(response.data);
      return response.data;
    } catch (err) {
      console.error('API Error:', err);

      let errorMessage = 'An error occurred';

      // Handle validation errors from the backend
      if (err.response?.data) {
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          // Express-validator format
          errorMessage = err.response.data.errors.map(error => error.msg).join('\n');
        } else if (err.response.data.error) {
          // Single error message format
          errorMessage = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          // Plain string error
          errorMessage = err.response.data;
        } else if (typeof err.response.data === 'object') {
          // Object error (convert to string)
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        // Network error or other axios error
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
};
