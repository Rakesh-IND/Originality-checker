import { useState, useRef } from 'react';
import { X, UploadCloud, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function UploadModal({ session, onClose, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    let completed = 0;
    let hasErrors = false;

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
        completed++;
        setProgress(Math.round((completed / files.length) * 100));
      } catch (error) {
        hasErrors = true;
        const errMsg = error.response?.data?.detail || error.message || "Unknown error";
        toast.error(`Failed to upload ${file.name}: ${errMsg}`);
      }
    }

    setUploading(false);
    
    if (completed > 0) {
      toast.success(`Successfully uploaded ${completed} image(s)!`);
      onUploadComplete();
    }
    
    if (!hasErrors) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-panel rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(59,130,246,0.15)]"
        >
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white tracking-wide">Upload Images</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {!uploading ? (
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-white/20 hover:border-blue-500/50 hover:bg-white/5'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                  <UploadCloud size={36} />
                </div>
                <p className="text-gray-200 font-medium mb-2 text-lg">Click or drag images here</p>
                <p className="text-sm text-gray-500">Supports JPEG, PNG, WebP up to 10MB</p>
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
              <div className="py-10 text-center flex flex-col items-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-blue-400">
                    {progress}%
                  </div>
                </div>
                <p className="font-medium text-gray-300 mb-2">Processing {files.length} images...</p>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  ></motion.div>
                </div>
              </div>
            )}

            {files.length > 0 && !uploading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Selected files ({files.length})</h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {files.map((file, i) => (
                    <li key={i} className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileImage size={16} className="text-blue-400 shrink-0" />
                        <span className="truncate text-gray-200">{file.name}</span>
                      </div>
                      <span className="text-gray-500 shrink-0 text-xs bg-black/20 px-2 py-1 rounded-md">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3 rounded-b-2xl">
            <button 
              onClick={onClose}
              disabled={uploading}
              className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Upload
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
