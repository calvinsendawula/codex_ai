import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Login = ({ onToggleForm }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 p-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Sign in to your account
      </h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-light hover:bg-primary-dark text-white py-2 rounded-lg 
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      
      <p className="text-center text-gray-600 dark:text-gray-400">
        Don't have an account?{' '}
        <button
          onClick={onToggleForm}
          disabled={isLoading}
          className="text-primary-light hover:text-primary-dark disabled:opacity-50"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

export default Login; 