import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';

const Register = ({ onToggleForm }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError('All fields are required');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Check if email exists
      const checkResponse = await api.get(`/check-user/${encodeURIComponent(formData.email)}`);
      if (checkResponse.data.exists) {
        setError('Email already exists');
        setIsLoading(false);
        return;
      }

      // Register
      await api.post('/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim(),
        password: formData.password
      });
      
      // Login after successful registration
      await login(formData.email, formData.password);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 p-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Create an account
      </h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 dark:text-gray-300" htmlFor="firstName">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 
                       dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          
          <div>
            <label className="text-gray-700 dark:text-gray-300" htmlFor="lastName">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 
                       dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        </div>
        
        <div>
          <label className="text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 
                     dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        
        <div>
          <label className="text-gray-700 dark:text-gray-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 
                     dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>
        
        <div>
          <label className="text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 
                     dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-light hover:bg-primary-dark text-white py-2 rounded-lg 
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      
      <p className="text-center text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <button
          onClick={onToggleForm}
          disabled={isLoading}
          className="text-primary-light hover:text-primary-dark disabled:opacity-50"
        >
          Sign in
        </button>
      </p>
    </div>
  );
};

export default Register; 