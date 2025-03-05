import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, FileText, ChevronDown, ArrowDown, CornerDownLeft, ArrowBigDown } from 'lucide-react';
import api from '../utils/axios';
import ReactMarkdown from 'react-markdown';
import ChatLengthWarning from './ChatLengthWarning';
import IntroSection from './IntroSection';

const CHAT_MODES = {
  concise: { label: 'Concise', description: 'Brief, focused answers' },
  balanced: { label: 'Balanced', description: 'Clear, well-explained answers' },
  detailed: { label: 'Detailed', description: 'Comprehensive, thorough explanations' }
};

const Chat = ({ sessionId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedMode, setSelectedMode] = useState('balanced');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [dropDirection, setDropDirection] = useState('down');
  const fileInputRef = useRef(null);
  const modeSelectorRef = useRef(null);
  const dropdownRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [warningThreshold, setWarningThreshold] = useState(0);
  const [alertThreshold, setAlertThreshold] = useState(0);
  const [isNewChat, setIsNewChat] = useState(true);

  if (!sessionId) {
    return <IntroSection />;
  }

  // Close mode selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target)) {
        setShowModeSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch documents when session changes
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!sessionId) return;
      try {
        const response = await api.get(`/sessions/${sessionId}/documents`);
        setDocuments(response.data.documents || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };
    fetchDocuments();
  }, [sessionId]);

  // Update the dropdown positioning effect
  useEffect(() => {
    if (!showModeSelector || !dropdownRef.current) return;
    
    // Drop up if 5 or fewer lines
    const lineCount = input.split('\n').length;
    setDropDirection(lineCount <= 5 ? 'up' : 'down');
  }, [showModeSelector, input]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Check document limit
    if (documents.length + files.length > 20) {
      setMessages(prev => [...prev, {
        isUser: false,
        isError: true,
        text: 'Maximum 20 documents allowed per chat'
      }]);
      return;
    }

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);

      try {
        const response = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        // Update documents list
        setDocuments(prev => [...prev, response.data.document]);
        
        setMessages(prev => [...prev, {
          isUser: false,
          text: `File "${file.name}" has been uploaded and processed successfully.`
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          isUser: false,
          isError: true,
          text: error.response?.data?.error || 'Error uploading file'
        }]);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    
    const newMessage = {
      isUser: true,
      text: input,
      mode: selectedMode
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: input,
        session_id: sessionId,
        mode: selectedMode
      });

      setMessages(prev => [...prev, {
        isUser: false,
        text: response.data.response,
        mode: selectedMode
      }]);
      
      if (response.data.session.id === sessionId) {
        const newCount = Math.floor(response.data.chatCount);
        setChatCount(newCount);
        setWarningThreshold(response.data.warningThreshold);
        setAlertThreshold(response.data.alertThreshold);
        // Only set isNewChat to false after first complete exchange
        if (newCount > 0) {
          setIsNewChat(false);
        }
      }
      
    } catch (error) {
      setMessages(prev => [...prev, {
        isUser: false,
        isError: true,
        text: error.response?.data?.error || 'Error sending message'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Update the session change effect
  useEffect(() => {
    setChatCount(0);
    setMessages([]);
    setIsNewChat(true);
    
    // Fetch existing messages for the session
    const fetchSessionMessages = async () => {
      if (!sessionId) return;
      try {
        const response = await api.get(`/sessions/${sessionId}/messages`);
        const sessionMessages = response.data.messages || [];
        setMessages(sessionMessages);
        
        // Only count complete exchanges (user message + AI response)
        const completeExchanges = Math.floor(sessionMessages.length / 2);
        setChatCount(completeExchanges);
        
        // A chat is new if it has no complete exchanges
        setIsNewChat(completeExchanges === 0);
      } catch (error) {
        console.error('Error fetching session messages:', error);
      }
    };
    
    fetchSessionMessages();
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show/hide scroll button based on scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewChat = () => {
    // Clear the current session by setting it to null
    // This will trigger the IntroSection to show
    window.location.href = '/'; // This will reset the app state
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      {/* Documents list */}
      {documents.length > 0 && (
        <div className="flex-shrink-0 border-b dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <FileText className="w-4 h-4" />
            <span>Documents ({documents.length}/20):</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
              >
                {doc.filename}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-primary-light text-white'
                  : message.isError
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
              }`}
            >
              {message.isUser ? (
                <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>
                    {message.text}
                  </ReactMarkdown>
                </div>
              )}
              {message.mode && (
                <div className="text-xs mt-1 opacity-70">
                  {CHAT_MODES[message.mode].label} mode
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Scroll anchor */}
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 p-2 bg-gray-100 dark:bg-gray-700 rounded-full shadow-lg 
                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </div>

      {/* Only show warning if we have complete exchanges and exceed threshold */}
      <div className="px-4">
        {chatCount > 0 && chatCount >= warningThreshold && (
          <ChatLengthWarning 
            chatCount={chatCount}
            warningThreshold={warningThreshold}
            alertThreshold={alertThreshold}
            onNewChat={handleNewChat}
          />
        )}
      </div>

      {/* Input container - make sure it stays at bottom */}
      <div className="flex-shrink-0 border-t dark:border-gray-700">
        <div className="mx-4 mt-4">
          {/* Mode selector styled as a tab */}
          <div 
            ref={modeSelectorRef}
            className="relative inline-block rounded-t-lg border dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2"
          >
            <button
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <span>{CHAT_MODES[selectedMode].label} mode</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropDirection === 'up' ? 'rotate-180' : ''}`} />
            </button>
            
            {showModeSelector && (
              <div 
                ref={dropdownRef}
                className={`absolute left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20
                  ${dropDirection === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'}`}
              >
                {Object.entries(CHAT_MODES).map(([mode, { label, description }]) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSelectedMode(mode);
                      setShowModeSelector(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 
                      ${mode === selectedMode ? 'bg-gray-50 dark:bg-gray-700' : ''}
                      text-gray-900 dark:text-gray-100
                      ${mode === Object.keys(CHAT_MODES)[0] ? 'rounded-t-lg' : ''}
                      ${mode === Object.keys(CHAT_MODES)[Object.keys(CHAT_MODES).length - 1] ? 'rounded-b-lg' : ''}`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat input box with matching styling */}
          <div className="rounded-lg rounded-tl-none border dark:border-gray-600 bg-gray-100 dark:bg-gray-700 -mt-[1px]">
            <div className="flex items-end p-2 space-x-2">
              <div className="flex-1 relative">
                {/* Keyboard hint - adjusted position and colors */}
                <div className="absolute -top-8 right-0 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-400">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    <ArrowBigDown className="w-3 h-3 inline" />
                    Shift
                  </kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    <CornerDownLeft className="w-3 h-3 inline" />
                    Enter
                  </kbd>
                  <span>for new line</span>
                </div>

                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full p-2 pr-8 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-600 
                           dark:text-white min-h-[40px] max-h-[240px] resize-none overflow-y-auto"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                  }}
                />
                {/* Scroll indicator */}
                {input && input.split('\n').length > 9 && (
                  <div className="absolute right-2 bottom-2 text-gray-400 dark:text-gray-500 bg-gradient-to-t from-gray-800 p-1 rounded-full">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                           bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf"
                  multiple
                />

                <button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="p-2 bg-primary-light text-white rounded-lg disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 