import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import IntroSection from './components/IntroSection';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { useAuth } from './context/AuthContext';
import Greeting from './components/Greeting';

function App() {
  const [isFileProcessed, setIsFileProcessed] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleSessionSelect = (session) => {
    if (session.documents?.length > 0) {
      setCurrentSession(session);
      setIsFileProcessed(true);
    } else {
      setCurrentSession(null);
      setIsFileProcessed(false);
    }
  };

  const handleFileProcessed = (sessionId) => {
    if (sessionId) {
      // Create a new session and select it
      setCurrentSession({ id: sessionId });
      setIsFileProcessed(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        {showRegister ? (
          <Register onToggleForm={() => setShowRegister(false)} />
        ) : (
          <Login onToggleForm={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="flex h-screen">
        <div className="w-64 flex-shrink-0">
          <Sidebar
            onSessionSelect={handleSessionSelect}
            currentSessionId={currentSession?.id}
            isDarkMode={isDarkMode}
            onThemeToggle={() => setIsDarkMode(!isDarkMode)}
          />
        </div>
        <main className="flex-1 overflow-hidden pt-16 relative">
          <Greeting />
          {currentSession && currentSession.documents?.length > 0 ? (
            <Chat sessionId={currentSession.id} />
          ) : (
            <IntroSection onFileProcessed={handleFileProcessed} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App; 