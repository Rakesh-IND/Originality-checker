import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { LogOut, Upload, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import UploadModal from '../components/UploadModal';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Dashboard({ session }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/images`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setImages(response.data);
    } catch (error) {
      console.error("Error fetching images", error);
      const errMsg = error.response?.data?.detail || error.message || "Unknown error";
      toast.error(`Failed to fetch images: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen relative z-10 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 glass-panel p-6 rounded-2xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Image Library</h1>
            <p className="text-gray-400">Manage and detect duplicate visuals</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => setShowUpload(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
              <Upload size={20} />
              <span>Upload</span>
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Loading your library...</p>
          </div>
        ) : images.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-16 text-center flex flex-col items-center justify-center"
          >
            <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <ImageIcon size={64} className="text-gray-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No images yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">Upload some images to start checking for originality and finding duplicates in your library.</p>
            <button 
              onClick={() => setShowUpload(true)}
              className="bg-white/10 hover:bg-white/15 text-white px-8 py-3 rounded-xl font-medium border border-white/20 transition-all hover:scale-105"
            >
              Upload First Image
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={image.id} 
                className="group relative glass-panel rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-500"
              >
                <div className="aspect-square bg-black/40 relative overflow-hidden">
                  {/* Public URL mapping assuming 'photos' bucket */}
                  <img 
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${image.storage_path}`}
                    alt={image.filename}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                  
                  {/* Matches Badge */}
                  {image.matches && image.matches.length > 0 ? (
                    <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400/30">
                      <AlertTriangle size={14} />
                      {image.matches.length} Match{image.matches.length > 1 ? 'es' : ''}
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/30">
                      <CheckCircle size={14} />
                      Original
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-medium text-gray-200 truncate mb-1" title={image.filename}>{image.filename}</h3>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>{(image.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>{new Date(image.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  
                  <Link 
                    to={`/compare/${image.id}`}
                    className="block w-full py-2.5 text-center text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors"
                  >
                    Analyze Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal 
          session={session} 
          onClose={() => setShowUpload(false)} 
          onUploadComplete={fetchImages}
        />
      )}
    </div>
  );
}
