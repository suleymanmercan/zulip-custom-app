import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { User as UserIcon, MessageSquare, Bot, Reply } from 'lucide-react';
import { cn } from '@/components/ui';
import { parseEmojis } from '@/utils/emoji';

export const MessageList = () => {
    const { messages, isLoadingMessages, fetchMessages, currentStream, currentTopic, zulipBaseUrl } = useChatStore();
    const user = useAuthStore(state => state.user);
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const unreadSeparatorRef = useRef<HTMLDivElement>(null);
    const isFetchingMore = useRef(false);
    const [prevTopic, setPrevTopic] = useState<string | null>(null);
    const [lastReadMessageId, setLastReadMessageId] = useState<number | null>(null);

    // Reply state - will be passed to MessageInput via context or props
    const handleReply = (senderName: string, content: string) => {
        // Strip HTML tags for clean quote
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Truncate if too long
        const quotedText = textContent.length > 100 
            ? textContent.substring(0, 100) + '...' 
            : textContent;
        
        // Create quote format with proper spacing
        const quoteText = `> @${senderName} dedi:\n> ${quotedText}\n\n\n`;
        
        // Trigger custom event to pass quote to MessageInput
        window.dispatchEvent(new CustomEvent('addQuote', { detail: quoteText }));
        
        // Scroll to input
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const rewriteUrls = (content: string) => {
        const effectiveBase = zulipBaseUrl || "https://bilgisayarkavramlari.zulipchat.com";
        const base = effectiveBase.replace(/\/$/, '');
        const proxyPrefix = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5070/api'}/proxy/image?url=`;

        // Smart emoji parsing: Parse :emoji: in text but preserve Zulip's <img> tags
        // Split by HTML tags to avoid parsing inside tags
        let processed = content.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
            if (tag) {
                // It's an HTML tag, don't parse emojis
                return tag;
            } else if (text) {
                // It's text, parse emojis
                return parseEmojis(text);
            }
            return match;
        });
        
        processed = processed
            // Fix all images (including emojis) using proxy
            .replace(/(src)=["'](\/?[^"']*)["']/g, (match, attr, path) => {
                // Skip data URLs
                if (path.startsWith('data:')) return match;
                
                // Handle absolute URLs
                if (path.startsWith('http')) {
                    // Only proxy Zulip URLs
                    if (path.includes(base) || path.includes('zulipchat.com')) {
                        return `${attr}="${proxyPrefix}${encodeURIComponent(path)}"`;
                    }
                    return match;
                }
                
                // Handle relative URLs (including emoji paths like /static/generated/emoji/...)
                const fullUrl = path.startsWith('/') ? base + path : base + '/' + path;
                return `${attr}="${proxyPrefix}${encodeURIComponent(fullUrl)}"`;
            })
            // Open links in new tab
            .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
            // Prepend base URL to relative links
            .replace(/href=["'](\/?[^"']*)["']/g, (match, path) => {
                if (path.startsWith('http') || path.startsWith('#')) return match;
                return `href="${base}/${path}"`;
            })
            // Handle style="background-image: url('/path')"
            .replace(/url\(['"]?\/?([^'")]*)['"]?\)/g, `url("${proxyPrefix}${encodeURIComponent(base + '/$1')}")`);
        
        return processed;
    };
  
    // Load last read message ID when topic changes
    useEffect(() => {
        if (currentStream && currentTopic) {
            const key = `lastRead_${currentStream.id}_${currentTopic}`;
            const saved = localStorage.getItem(key);
            setLastReadMessageId(saved ? parseInt(saved) : null);
        }
    }, [currentStream, currentTopic]);

    // Save last read message ID when messages are visible
    useEffect(() => {
        if (messages.length > 0 && currentStream && currentTopic) {
            const lastMessageId = messages[messages.length - 1].id;
            const key = `lastRead_${currentStream.id}_${currentTopic}`;
            
            // Update after a delay (user has seen the messages)
            const timer = setTimeout(() => {
                localStorage.setItem(key, lastMessageId.toString());
                setLastReadMessageId(lastMessageId);
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [messages, currentStream, currentTopic]);

    // Scroll to unread separator or bottom when topic changes
    useEffect(() => {
        if (currentTopic && currentTopic !== prevTopic) {
            setPrevTopic(currentTopic);
            setTimeout(() => {
                // If there's an unread separator, scroll to it
                if (unreadSeparatorRef.current) {
                    unreadSeparatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Otherwise scroll to bottom
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [currentTopic, prevTopic]);

    // Auto-scroll for new messages only if user is at bottom
    useEffect(() => {
        // Only auto-scroll if user is already near the bottom (within 100px)
        if (!isFetchingMore.current && containerRef.current && messages.length > 0) {
            const container = containerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            
            // Auto-scroll only if user is already at the bottom
            if (isNearBottom) {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollTop === 0 && messages.length > 0 && !isFetchingMore.current) {
            const firstMsgId = messages[0].id;
            isFetchingMore.current = true;
            const oldScrollHeight = target.scrollHeight;

            await fetchMessages(firstMsgId, true);
            
            requestAnimationFrame(() => {
                if (containerRef.current) {
                    const newScrollHeight = containerRef.current.scrollHeight;
                    containerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
                }
                isFetchingMore.current = false;
            });
        }
    };
  
    if (!currentStream || !currentTopic) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#1a1f28]">
           <div className="w-24 h-24 rounded-[2rem] bg-[#232932] border border-gray-700 shadow-2xl flex items-center justify-center mb-6 rotate-3">
             <Bot className="w-12 h-12 text-indigo-500" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Projenizi Seçin</h3>
           <p className="text-sm max-w-xs text-center text-gray-600 font-medium">Sol menüden bir kanal ve konu seçerek iletişime başlayın.</p>
        </div>
      );
    }
  
    if (isLoadingMessages && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#1a1f28]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Veriler İşleniyor</span>
              </div>
            </div>
        );
    }
  
    return (
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#1a1f28] custom-scrollbar"
      >
        {/* Chat info header inside list */}
        <div className="sticky top-0 z-20 flex items-center justify-center py-2 -mx-6 bg-gradient-to-b from-[#1a1f28] via-[#1a1f28] to-transparent">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-[#232932]/80 backdrop-blur-md rounded-full border border-gray-700/50 shadow-lg">
                <div className="flex items-center gap-1.5 border-r border-gray-700 pr-3 mr-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">{currentStream.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-gray-500" />
                    <span className="text-[11px] font-medium text-gray-400">{currentTopic}</span>
                </div>
            </div>
        </div>

        <div className="pt-4 pb-8 space-y-6">
            {messages.length === 0 && !isLoadingMessages && (
                <div className="py-20 text-center">
                    <p className="text-gray-700 text-sm font-medium italic">Henüz mesaj bulunmuyor...</p>
                </div>
            )}

            {messages.map((msg, index) => {
                const isMe = msg.sender_email === user?.email;
                const isChain = index > 0 && messages[index - 1].sender_email === msg.sender_email; 
                const isFirstUnread = lastReadMessageId && msg.id > lastReadMessageId && (index === 0 || messages[index - 1].id <= lastReadMessageId);

                return (
                    <div key={msg.id}>
                        {/* Unread Separator */}
                        {isFirstUnread && (
                            <div 
                                ref={unreadSeparatorRef}
                                className="flex items-center gap-3 my-6 px-4"
                            >
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-red-500/50"></div>
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider px-3 py-1 bg-red-500/10 rounded-full border border-red-500/30">
                                    Yeni Mesajlar
                                </span>
                                <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-red-500/50 to-red-500/50"></div>
                            </div>
                        )}

                        <div className={cn("flex gap-4 max-w-4xl group", isMe ? 'ml-auto flex-row-reverse' : '', isChain ? 'mt-1' : 'mt-6')}>
                        {/* Avatar */}
                        {!isChain ? (
                            <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xl shrink-0 mt-1 transition-transform group-hover:scale-105",
                                isMe ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500' : 'bg-gray-800 border border-gray-700'
                            )}>
                                {msg.sender_full_name ? msg.sender_full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                            </div>
                        ) : (
                            <div className="w-9 shrink-0 flex items-start justify-center pt-2">
                                <span className="text-[9px] text-gray-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    {new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 max-w-[80%]`}>
                            {!isChain && (
                                <div className="flex items-center gap-3 mb-1.5 px-1">
                                    <span className="text-[13px] font-bold text-gray-200">{msg.sender_full_name}</span>
                                    <span className="text-[10px] text-gray-600 font-mono tracking-tighter">
                                        {new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            )}
                            <div 
                                className={cn(
                                    "relative group/message px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-lg break-words border transition-all duration-300",
                                    isMe 
                                    ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-sm hover:shadow-indigo-500/10' 
                                    : 'bg-[#232932] border-gray-700 text-gray-200 rounded-tl-sm hover:border-gray-600'
                                )}
                            >
                                {/* Reply Button */}
                                <button
                                    onClick={() => handleReply(msg.sender_full_name, msg.content)}
                                    className={cn(
                                        "absolute -top-8 opacity-0 group-hover/message:opacity-100 transition-opacity",
                                        "px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600",
                                        "flex items-center gap-1 text-[11px] text-gray-300 font-medium",
                                        isMe ? "right-0" : "left-0"
                                    )}
                                    title="Alıntı yap"
                                >
                                    <Reply className="w-3 h-3" />
                                    <span>Alıntı</span>
                                </button>
                                <div 
                                    className="prose prose-sm max-w-none prose-p:my-0 prose-invert"
                                    dangerouslySetInnerHTML={{ __html: rewriteUrls(msg.content) }} 
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
        <div ref={bottomRef} className="h-4" />
      </div>
    );
  };
