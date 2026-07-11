import { useState, useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function UploadModal({ session, onClose, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    let completed = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await axios.post(`${API_URL}/images/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      } catch (error) {
        console.error("Error uploading file", file.name, error);
      }
      
      completed++;
      setProgress(Math.round((completed / files.length) * 100));
    }

    setUploading(false);
    onUploadComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Upload Images</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!uploading ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">Click or drag images here</p>
              <p className="text-sm text-gray-500">JPEG, PNG, WebP up to 10MB</p>
              <input 
                type="file" 
                multiple 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-medium text-gray-700 mb-2">Uploading {files.length} images...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {files.length > 0 && !uploading && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected files ({files.length})</h3>
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {files.map((file, i) => (
                  <li key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                    <span className="truncate pr-4">{file.name}</span>
                    <span className="text-gray-500 shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
