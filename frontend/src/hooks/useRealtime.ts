import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

export const useRealtime = () => {
    const { addMessage, setUnreads } = useChatStore();
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bufferRef = useRef("");

    useEffect(() => {
        const connect = async () => {
             const currentToken = useAuthStore.getState().accessToken;
             if (!currentToken) {
                 retryTimeoutRef.current = setTimeout(connect, 3000);
                 return;
             }

             try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5070/api'}/events/stream`, {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                });

                if (!response.ok) throw new Error('SSE Connection failed');

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (!reader) return;

                console.log('SSE Connected');
                bufferRef.current = ""; // Reset buffer on new connection

                const processMessage = (jsonStr: string) => {
                    try {
                        const data = JSON.parse(jsonStr);
                        // console.log('SSE Event:', data);
                        
                        const handleEvent = (event: any) => {
                            if (event.type === 'message' && event.message) {
                                // Prefer rendered HTML content for emojis/formatting
                                if (event.message.rendered_content) {
                                    event.message.content = event.message.rendered_content;
                                }
                                addMessage(event.message);
                            } else if (event.type === 'metadata' && event.unread_msgs) {
                                console.log('Got Initial Metadata:', event);
                                setUnreads(event.unread_msgs, event.zulip_base_url);
                            }
                        };

                        if (Array.isArray(data)) {
                            data.forEach(handleEvent);
                        } else {
                            handleEvent(data);
                        }
                    } catch (e) {
                        console.error('SSE Parse Error', e, 'JSON:', jsonStr);
                    }
                };

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    bufferRef.current += decoder.decode(value, { stream: true });
                    const parts = bufferRef.current.split('\n\n');
                    
                    // Keep the last part in the buffer (it might be incomplete)
                    bufferRef.current = parts.pop() || "";
                    
                    for (const part of parts) {
                        const line = part.trim();
                        if (line.startsWith('data: ')) {
                            processMessage(line.replace('data: ', '').trim());
                        }
                    }
                }
             } catch (error) {
                 console.error('SSE Error, retrying...', error);
                 retryTimeoutRef.current = setTimeout(connect, 3000);
             }
        };

        connect();
        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);
};
