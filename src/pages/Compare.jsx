import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sliders, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Compare({ session }) {
  const { id } = useParams();
  const [image, setImage] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(90);

  const fetchMatches = async (currentThreshold) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/images/${id}/matches`, {
        params: { threshold: currentThreshold },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setImage(response.data.target);
      setMatches(response.data.matches);
    } catch (error) {
      console.error("Error fetching matches", error);
      const errMsg = error.response?.data?.detail || error.message || "Unknown error";
      toast.error(`Analysis failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(threshold);
  }, [id, session]);

  const handleThresholdChange = (e) => {
    setThreshold(e.target.value);
  };

  const applyThreshold = () => {
    fetchMatches(threshold);
  };

  if (loading && !image) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen relative z-10 p-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Image not found</h2>
        <Link to="/dashboard" className="text-blue-400 hover:text-blue-300">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
          <ArrowLeft size={20} />
          <span>Back to Library</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Target Image Analysis */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel p-6 rounded-2xl"
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                Target Image
              </h2>
              <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 mb-4">
                <img 
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${image.storage_path}`}
                  alt={image.filename}
                  className="w-full aspect-square object-contain"
                />
              </div>
              <div className="space-y-2 text-sm text-gray-400 bg-black/20 p-4 rounded-xl border border-white/5">
                <p><span className="text-gray-500 w-24 inline-block">Filename:</span> <span className="text-gray-200">{image.filename}</span></p>
                <p><span className="text-gray-500 w-24 inline-block">Size:</span> <span className="text-gray-200">{(image.file_size / 1024 / 1024).toFixed(2)} MB</span></p>
                <p><span className="text-gray-500 w-24 inline-block">Hash:</span> <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded text-blue-300">{image.dhash}</span></p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-6 rounded-2xl"
            >
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Sliders size={18} className="text-purple-400" />
                Sensitivity Threshold
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  value={threshold} 
                  onChange={handleThresholdChange}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="font-mono bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg border border-purple-500/30 font-medium">
                  {threshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Lower thresholds will match visually similar images. Higher thresholds only match near-identical images.
              </p>
              <button 
                onClick={applyThreshold}
                disabled={loading}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
              >
                Re-analyze
              </button>
            </motion.div>
          </div>

          {/* Matches List */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 md:p-8 rounded-2xl min-h-full"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white tracking-tight">Similarity Results</h2>
                {matches.length > 0 ? (
                  <span className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-medium border border-red-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={16} />
                    {matches.length} matches found
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium border border-emerald-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <CheckCircle size={16} />
                    Unique image
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-block p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
                    <CheckCircle size={48} className="text-emerald-500" />
                  </div>
                  <p className="text-xl text-emerald-400 font-medium mb-2">No duplicates found</p>
                  <p className="text-gray-500">This image appears to be unique in your library at {threshold}% similarity.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {matches.map((match, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={match.image.id} 
                      className="flex flex-col sm:flex-row gap-6 p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="w-full sm:w-48 aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                        <img 
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${match.image.storage_path}`}
                          alt={match.image.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-200 text-lg truncate pr-4">{match.image.filename}</h4>
                          <span className={`px-3 py-1 text-sm font-bold rounded-lg border ${
                            match.similarity >= 95 
                              ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}>
                            {match.similarity.toFixed(1)}% Match
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-500 mt-2">
                          <p>Added: {new Date(match.image.uploaded_at).toLocaleDateString()}</p>
                          <p>Size: {(match.image.file_size / 1024 / 1024).toFixed(2)} MB</p>
                          <p className="font-mono text-xs mt-2 bg-black/30 p-2 rounded block">Hash: {match.image.dhash}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
