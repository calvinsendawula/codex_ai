import { PlusCircle } from 'lucide-react';

const ChatLengthWarning = ({ chatCount, warningThreshold, alertThreshold, onNewChat }) => {
  if (chatCount < warningThreshold) return null;

  const isAlert = chatCount >= alertThreshold;
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg mb-4 ${
      isAlert 
        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100' 
        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-100'
    }`}>
      <p className="text-sm">
        {isAlert ? (
          'This conversation is getting quite long. Consider starting a new chat for better performance.'
        ) : (
          'Long conversations may impact response quality as context gets truncated.'
        )}
      </p>
      {isAlert && (
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-3 py-1 ml-4 text-sm bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
      )}
    </div>
  );
};

export default ChatLengthWarning; 