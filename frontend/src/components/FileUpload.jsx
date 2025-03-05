import { useState } from 'react';
import { Upload } from 'lucide-react';
import api from '../utils/axios';

const FileUpload = ({ sessionId, onFileProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Call the parent's callback with the session info
      onFileProcessed(response.data.session_id);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-8 max-w-xl mx-auto">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-surface-light dark:bg-surface-dark hover:bg-gray-100 dark:hover:bg-gray-700">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {isUploading ? (
              <span>Processing...</span>
            ) : (
              <span>
                <span className="font-semibold">Click to upload</span> or drag and drop
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">PDF files only</p>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default FileUpload; 