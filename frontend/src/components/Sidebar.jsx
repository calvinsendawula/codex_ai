import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, Sun, Moon, Plus, MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import api from '../utils/axios';

const ChatItem = ({ session, isActive, onSelect, onRename, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name || '');
  const dropdownRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRename = async () => {
    await onRename(session.id, editName.trim());
    setIsEditing(false);
    setShowDropdown(false);
  };

  const truncateText = (text, limit = 25) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  return (
    <div className="relative mb-2 group">
      <div className={`flex items-center p-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-primary-light text-white' 
          : 'text-gray-300 hover:bg-gray-700'
      }`}>
        <button
          onClick={() => onSelect(session)}
          className="flex-1 flex items-center text-left min-w-0"
        >
          <FileText className="w-5 h-5 min-w-[20px] mr-2" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-transparent border-b outline-none text-gray-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
                maxLength={50}
              />
            ) : (
              <>
                <div className="truncate font-medium">
                  {truncateText(session.name || session.documents?.[0]?.filename || 'New Chat')}
                </div>
                {session.documents?.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {session.documents.length} document{session.documents.length !== 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </div>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={`p-1.5 rounded-full ml-2 ${
            showDropdown 
              ? 'bg-gray-700 text-gray-300' 
              : 'opacity-0 group-hover:opacity-100 hover:bg-gray-700 text-gray-400'
          } transition-all`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-1 py-1 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700"
        >
          <button
            onClick={() => {
              setIsEditing(true);
              setShowDropdown(false);
              setEditName(session.name || '');
            }}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Rename
          </button>
          <button
            onClick={() => {
              onDelete(session.id);
              setShowDropdown(false);
            }}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ onSessionSelect, currentSessionId, isDarkMode, onThemeToggle }) => {
  const [sessions, setSessions] = useState([]);
  const { logout, user } = useAuth();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get('/sessions');
        setSessions(response.data.sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, []);

  const createNewChat = async () => {
    try {
      // Check if we already have a "New Chat" session
      const newChat = sessions.find(s => !s.documents?.length);
      if (newChat) {
        // If exists, just select it
        onSessionSelect(newChat);
        return;
      }

      // If no new chat exists, create one
      const response = await api.post('/sessions/new');
      setSessions([response.data.session, ...sessions]);
      onSessionSelect(response.data.session);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Sort sessions to show new chat first, then others by date
  const sortedSessions = [...sessions].sort((a, b) => {
    // New chat (no documents) goes first
    if (!a.documents?.length && b.documents?.length) return -1;
    if (a.documents?.length && !b.documents?.length) return 1;
    // Then sort by date descending
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRename = async (sessionId, newName) => {
    try {
      const response = await api.patch(`/sessions/${sessionId}`, {
        name: newName.trim()
      });
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, name: newName.trim() } : s
      ));
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      console.log('Attempting to delete session:', sessionId);
      const response = await api.delete(`/sessions/${sessionId}`);
      console.log('Delete response:', response);
      
      // First update the sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If we're deleting the current session, select null or another session
      if (currentSessionId === sessionId) {
        // Find the next available session
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          onSessionSelect(remainingSessions[0]);
        } else {
          onSessionSelect(null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      console.error('Error details:', error.response?.data);
      // Show error to user with more details
      alert(`Failed to delete chat: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      {/* Logo Section */}
      <div className="p-4 border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold text-primary-light">Codex AI</h1>
      </div>
      
      {/* New Chat Button */}
      <button
        onClick={createNewChat}
        className="m-4 p-2 flex items-center justify-center gap-2 bg-primary-light hover:bg-primary-dark 
                 text-white rounded-lg transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>New Chat</span>
      </button>
      
      {/* Chats/Documents Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Your Chats
        </h2>
        {sortedSessions.map((session) => (
          <ChatItem
            key={session.id}
            session={session}
            isActive={currentSessionId === session.id}
            onSelect={onSessionSelect}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
      
      {/* Settings Section */}
      <div className="border-t dark:border-gray-700 p-4 space-y-2">
        <button
          onClick={onThemeToggle}
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 
                   dark:hover:bg-gray-700 transition-colors"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-5 h-5 mr-2 text-yellow-400" />
              <span className="text-yellow-400">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 mr-2" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 
                   dark:hover:bg-gray-700 text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 