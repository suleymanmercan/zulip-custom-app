import { Users, Hash, MessageSquare, Info, Plus, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/components/ui';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

interface StreamMember {
  user_id: number;
  full_name: string;
  email: string;
}

export const ChatNavbar = () => {
  const { currentStream, currentTopic } = useChatStore();
  const token = useAuthStore(state => state.accessToken);
  const [showInfo, setShowInfo] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<StreamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (showMembers && currentStream) {
      fetchMembers();
    }
  }, [showMembers, currentStream]);

  const fetchMembers = async () => {
    if (!currentStream) return;
    
    setLoadingMembers(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5070/api';
      const response = await axios.get(`${apiBase}/streams/${currentStream.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMembers(response.data.subscribers || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]); // Set empty array on error
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!currentStream || !currentTopic) {
    return null;
  }

  return (
    <>
      <div className="h-16 bg-[#0f1216] border-b border-gray-800/50 flex items-center justify-between px-6 shadow-xl">
        {/* Left: Stream & Topic Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1e23] rounded-xl border border-gray-800 shadow-lg">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-gray-200">{currentStream.name}</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm text-gray-400 font-medium">{currentTopic}</span>
            </div>
          </div>

          {/* Info Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "p-2 rounded-lg transition-all border",
              showInfo 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                : "bg-gray-800/50 text-gray-400 hover:bg-indigo-600/10 hover:text-indigo-400 border-gray-700 hover:border-indigo-500/50"
            )}
            title="Kanal bilgisi"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Members */}
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-lg transition-all text-emerald-400 hover:text-emerald-300 border border-emerald-600/30 hover:border-emerald-500/50"
            title="Üyeler"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Üyeler</span>
          </button>

          {/* Custom Button */}
          <button
            className="flex items-center gap-2 px-3 py-2 bg-purple-600/10 hover:bg-purple-600/20 rounded-lg transition-all text-purple-400 hover:text-purple-300 border border-purple-600/30 hover:border-purple-500/50"
            title="Özel Buton"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Özel</span>
          </button>
        </div>

        {/* Info Panel (Slide down) */}
        {showInfo && (
          <div className="absolute top-16 left-0 right-0 bg-[#1a1e23] border-b border-gray-800 shadow-2xl z-50 animate-in slide-in-from-top duration-200">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stream Info */}
                <div className="p-4 bg-[#0f1216] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-gray-200">Kanal</h3>
                  </div>
                  <p className="text-xs text-gray-400">{currentStream.name}</p>
                  <p className="text-[10px] text-gray-600 mt-1">ID: {currentStream.id}</p>
                </div>

                {/* Topic Info */}
                <div className="p-4 bg-[#0f1216] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-gray-200">Başlık</h3>
                  </div>
                  <p className="text-xs text-gray-400">{currentTopic}</p>
                </div>

                {/* Stats */}
                <div className="p-4 bg-[#0f1216] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-gray-200">Üye Sayısı</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{members.length || '...'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1e23] rounded-2xl border border-gray-800 shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-gray-200">Kanal Üyeleri</h2>
                {members.length > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 text-xs font-bold rounded-full">
                    {members.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 bg-[#0f1216] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{member.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Üye bilgisi alınamadı</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

