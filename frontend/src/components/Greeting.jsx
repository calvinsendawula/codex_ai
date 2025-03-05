import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Greeting = () => {
  const [greeting, setGreeting] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="absolute top-4 right-6 text-gray-600 dark:text-gray-300">
      {greeting}, {user?.firstName}
    </div>
  );
};

export default Greeting; 