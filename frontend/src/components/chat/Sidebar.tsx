import { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Hash, LogOut, User, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export const Sidebar = () => {
  const { 
    streams, 
    topics, 
    currentStream,
    currentTopic,
    fetchStreams, 
    selectStream, 
    selectTopic,
    logout: logoutChat,
    unreadCounts
  } = useChatStore();
  
  const { logout: logoutAuth, user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedStreams, setExpandedStreams] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchStreams();
  }, []);

  // Auto-expand current stream
  useEffect(() => {
    if (currentStream) {
      setExpandedStreams(prev => new Set(prev).add(currentStream.id));
    }
  }, [currentStream]);

  // Auto-select single topic streams
  useEffect(() => {
    if (currentStream && !currentTopic) {
      const streamTopics = topics[currentStream.id] || [];
      if (streamTopics.length === 1) {
        selectTopic(streamTopics[0].name);
      }
    }
  }, [currentStream, topics, currentTopic]);

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
      logoutChat();
      logoutAuth();
      navigate('/login');
  };

  const toggleStream = (streamId: number) => {
    setExpandedStreams(prev => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
      } else {
        next.add(streamId);
      }
      return next;
    });
  };

  const handleStreamClick = (stream: any) => {
    selectStream(stream);
    // Auto-expand when selecting
    setExpandedStreams(prev => new Set(prev).add(stream.id));
  };

  return (
    <>
      {/* Toggle Button (visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1f28] border border-[#2a3038] hover:bg-[#232932] transition-all shadow-xl"
          title="Sidebar'ı Aç (Ctrl+B)"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      )}

      <aside className={cn(
        "bg-[#1a1f28] text-gray-400 flex flex-col h-full border-r border-[#2a3038] shadow-2xl transition-all duration-300",
        isOpen ? "w-72" : "w-0 -ml-72"
      )}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-[#2a3038]">
          <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              Z
              </div>
              <div>
                  <h1 className="text-sm font-bold text-white tracking-wide">Zulip Mini</h1>
                  <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase font-display">Sistem Aktif</span>
                  </div>
              </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            title="Sidebar'ı Kapat (Ctrl+B)"
          >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <div className="px-6 mb-4 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.1em]">Kanallar</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500 font-mono">{streams.length}</span>
          </div>

          {streams.length === 0 && (
              <div className="px-6 py-8 text-center bg-gray-900/20 mx-4 rounded-2xl border border-gray-800/20">
                  <Hash className="w-5 h-5 text-gray-700 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-600 font-medium">Kanallar aranıyor...</p>
              </div>
          )}

          <div className="space-y-2 px-3">
              {streams.map((stream) => {
              const isSelected = currentStream?.id === stream.id;
              const isExpanded = expandedStreams.has(stream.id);
              const streamTopics = topics[stream.id] || [];
              const streamUnreads = unreadCounts[`${stream.id}`] || 0;

              return (
                  <div key={stream.id} className="group">
                  {/* Stream Container */}
                  <div className={cn(
                    "rounded-xl transition-all",
                    isSelected ? "bg-gradient-to-r from-indigo-500/5 to-purple-500/5 ring-1 ring-indigo-500/20" : ""
                  )}>
                    <div className="flex items-center gap-1 p-1">
                      <button
                          onClick={() => handleStreamClick(stream)}
                          className={cn(
                          "flex-1 text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 flex items-center gap-3",
                          isSelected 
                              ? "bg-indigo-500/10 text-indigo-300 shadow-sm" 
                              : "text-gray-400 hover:bg-[#232932] hover:text-gray-200"
                          )}
                      >
                          <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm",
                              isSelected ? "bg-indigo-500/20 ring-1 ring-indigo-500/30" : "bg-gray-800/60 group-hover:bg-gray-700/60"
                          )}>
                              <Hash className={cn("w-4 h-4", isSelected ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-400")} />
                              {!isSelected && streamUnreads > 0 && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f1216] animate-pulse shadow-lg shadow-red-500/50" />
                              )}
                          </div>
                          <span className="truncate flex-1 tracking-tight">{stream.name}</span>
                          {streamUnreads > 0 && (
                              <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full min-w-[24px] text-center border border-red-500/30">
                                  {streamUnreads > 99 ? '99+' : streamUnreads}
                              </span>
                          )}
                      </button>
                      
                      {/* Expand/Collapse button */}
                      {streamTopics.length > 0 && (
                        <button
                          onClick={() => toggleStream(stream.id)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isExpanded 
                              ? "text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20" 
                              : "text-gray-600 hover:text-gray-400 hover:bg-gray-800/50"
                          )}
                          title={isExpanded ? "Kapat" : "Aç"}
                        >
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                        </button>
                      )}
                    </div>

                    {/* Topics */}
                    {isExpanded && streamTopics.length > 0 && (
                        <div className="pb-2 px-2 mt-1">
                          <div className="ml-6 pl-4 border-l-2 border-indigo-500/20 space-y-1 animate-in slide-in-from-top-2 duration-200">
                          {streamTopics.map((topic) => {
                              const isTopicActive = currentTopic === topic.name;
                              const topicUnreads = unreadCounts[`${stream.id}:${topic.name}`] || 0;

                              return (
                                  <button
                                  key={topic.name}
                                  onClick={() => selectTopic(topic.name)}
                                  className={cn(
                                      "w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all flex items-center gap-2.5 pr-2",
                                      isTopicActive
                                      ? "bg-gray-800/90 text-white font-semibold shadow-sm ring-1 ring-gray-700/50"
                                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                                  )}
                                  >
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    isTopicActive 
                                      ? "bg-indigo-400 shadow-sm shadow-indigo-400/50" 
                                      : (topicUnreads > 0 ? "bg-red-500 animate-pulse shadow-sm shadow-red-500/50" : "bg-gray-600")
                                  )} />
                                  <span className="truncate flex-1">{topic.name}</span>
                                  {topicUnreads > 0 && !isTopicActive && (
                                      <span className="w-5 h-5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse shadow-sm">
                                          {topicUnreads > 9 ? '9+' : topicUnreads}
                                      </span>
                                  )}
                                  </button>
                              );
                          })}
                          </div>
                        </div>
                    )}
                  </div>
                  </div>
              );
              })}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 bg-[#151a21] border-t border-[#2a3038]">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-indigo-500/10">
                      <User className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0b0e11]"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-200 truncate leading-none mb-1">{user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-gray-600 truncate font-mono tracking-tight">{user?.email}</p>
                </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold text-red-500/80 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              OTURUMU KAPAT
            </button>
        </div>
      </aside>
    </>
  );
};
