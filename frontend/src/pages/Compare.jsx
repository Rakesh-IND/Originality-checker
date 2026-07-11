import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Compare({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [targetImage, setTargetImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(90);

  useEffect(() => {
    fetchMatches();
  }, [id, threshold, session]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // We also need the target image info. The API could return it or we fetch it.
      // Currently the /api/images/{id}/matches only returns matches.
      // Let's fetch all images to get the target image first.
      const imagesRes = await axios.get(`${API_URL}/images`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      const target = imagesRes.data.find(img => img.id === id);
      if (!target) {
        navigate('/');
        return;
      }
      setTargetImage(target);

      const matchesRes = await axios.get(`${API_URL}/images/${id}/matches?threshold=${threshold}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setMatches(matchesRes.data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    
    try {
      await axios.delete(`${API_URL}/images/${imageId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (imageId === id) {
        navigate('/');
      } else {
        fetchMatches(); // refresh matches
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image.");
    }
  };

  const getPublicUrl = (storagePath) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  if (loading && !targetImage) {
    return <div className="flex h-screen items-center justify-center">Loading comparison...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Compare Matches</h1>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-lg">
          <SlidersHorizontal size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Similarity Threshold:</span>
          <input 
            type="range" 
            min="50" 
            max="100" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-bold text-gray-900 w-12">{threshold}%</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {matches.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No matches found above {threshold}% similarity.
          </div>
        ) : (
          <div className="space-y-12">
            {matches.map((match, index) => (
              <div key={match.image.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-px bg-gray-200 relative">
                  
                  {/* Central badge showing similarity */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className={`px-4 py-2 rounded-full shadow-lg font-bold text-lg text-white border-2 border-white
                      ${match.similarity >= 98 ? 'bg-red-500' : 
                        match.similarity >= 90 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                    >
                      {match.similarity.toFixed(1)}% Similar
                    </div>
                  </div>

                  {/* Left: Target Image */}
                  <div className="bg-white p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Original</span>
                      <button 
                        onClick={() => handleDelete(targetImage.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete this image"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={getPublicUrl(targetImage.storage_path)} 
                        alt={targetImage.filename} 
                        className="max-h-[500px] object-contain"
                      />
                    </div>
                    <div className="mt-3 text-sm text-gray-500 flex justify-between">
                      <span className="truncate pr-4">{targetImage.filename}</span>
                      <span>{(targetImage.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Right: Matched Image */}
                  <div className="bg-white p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-blue-500 uppercase tracking-wider">Match {index + 1}</span>
                      <button 
                        onClick={() => handleDelete(match.image.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete this image"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={getPublicUrl(match.image.storage_path)} 
                        alt={match.image.filename} 
                        className="max-h-[500px] object-contain"
                      />
                    </div>
                    <div className="mt-3 text-sm text-gray-500 flex justify-between">
                      <span className="truncate pr-4">{match.image.filename}</span>
                      <span>{(match.image.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
