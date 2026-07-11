import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Upload, Settings } from 'lucide-react';
import axios from 'axios';
import UploadModal from '../components/UploadModal';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Dashboard({ session }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/images`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setImages(response.data);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchImages();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getPublicUrl = (storagePath) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold">Originality</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Upload size={18} />
            Upload
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
            title="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">Loading your gallery...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No images yet</h3>
            <p className="text-gray-500 mb-4">Upload some photos to start detecting duplicates.</p>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="text-blue-600 font-medium hover:underline"
            >
              Upload your first image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map(img => (
              <Link 
                to={img.match_count > 0 ? `/compare/${img.id}` : '#'} 
                key={img.id}
                className={`relative group block rounded-xl overflow-hidden aspect-square bg-gray-200 shadow-sm ${img.match_count > 0 ? 'cursor-pointer hover:ring-4 hover:ring-blue-400' : 'cursor-default'}`}
              >
                <img 
                  src={getPublicUrl(img.storage_path)} 
                  alt={img.filename} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                
                {img.match_count > 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                    {img.match_count} Match{img.match_count > 1 ? 'es' : ''}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {isUploadModalOpen && (
        <UploadModal 
          session={session} 
          onClose={() => setIsUploadModalOpen(false)} 
          onUploadComplete={fetchImages} 
        />
      )}
    </div>
  );
}
