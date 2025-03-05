import { BookOpen, MessageSquare, Shield } from 'lucide-react';
import FileUpload from './FileUpload';

const IntroSection = ({ onFileProcessed }) => {
  return (
    <div className="p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg border dark:border-gray-700 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Welcome to Codex AI
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Codex AI is your intelligent document analysis companion. Upload any PDF document 
          and engage in meaningful conversations about its content. Our AI will provide 
          accurate, context-aware responses based solely on the information within your documents.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <BookOpen className="w-6 h-6 text-primary-light" />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  Document-Focused
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get precise answers drawn directly from your uploaded documents
                </p>
              </div>
            </div>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MessageSquare className="w-6 h-6 text-primary-light" />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  Contextual Chat
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Have natural conversations while staying focused on document content
                </p>
              </div>
            </div>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-primary-light" />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  Secure & Private
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your documents and conversations remain private and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg border dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
          Start by uploading a document
        </h3>
        <FileUpload onFileProcessed={onFileProcessed} />
      </div>
    </div>
  );
};

export default IntroSection; 