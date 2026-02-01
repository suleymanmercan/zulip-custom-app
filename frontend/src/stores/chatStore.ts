import { create } from 'zustand';
import type { Stream, Topic } from '@/types/stream';
import type { Message } from '@/types/message';
import { streamsApi } from '@/api/streams';
import { messagesApi } from '@/api/messages';

interface ChatState {
  streams: Stream[];
  topics: Record<number, Topic[]>; // Cache topics by streamId
  currentStream: Stream | null;
  currentTopic: string | null;
  messages: Message[];
  
  isLoadingStreams: boolean;
  isLoadingMessages: boolean;
  unreadCounts: Record<string, number>; 
  zulipBaseUrl: string | null;
  
  // Actions
  fetchStreams: () => Promise<void>;
  fetchTopics: (streamId: number) => Promise<void>;
  selectStream: (stream: Stream) => void;
  selectTopic: (topic: string) => void;
  fetchMessages: (anchor?: number | 'newest', isMore?: boolean) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: any) => void;
  clearUnreads: (streamId: number, topic?: string) => void;
  setUnreads: (unreadMsgs: any, baseUrl?: string) => void;
  logout: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  streams: [],
  topics: {},
  currentStream: null,
  currentTopic: null,
  messages: [],
  unreadCounts: {},
  isLoadingStreams: false,
  isLoadingMessages: false,
  zulipBaseUrl: localStorage.getItem('zulipBaseUrl'),

  fetchStreams: async () => {
    set({ isLoadingStreams: true });
    try {
      console.log('Fetching streams...');
      const streams = await streamsApi.getStreams();
      console.log('Streams fetched:', streams);
      set({ streams });
    } catch (error) {
      console.error('Failed to fetch streams', error);
    } finally {
      set({ isLoadingStreams: false });
    }
  },

  logout: () => {
    set({ 
        streams: [], 
        topics: {}, 
        currentStream: null, 
        currentTopic: null, 
        messages: [],
        unreadCounts: {}
    });
  },

  fetchTopics: async (streamId) => {
    // Check cache first? For now always fetch fresh
    try {
      const fetchedTopics = await streamsApi.getTopics(streamId);
      set((state) => ({
        topics: { ...state.topics, [streamId]: fetchedTopics }
      }));
    } catch (error) {
      console.error('Failed to fetch topics', error);
    }
  },

  selectStream: (stream) => {
    const state = get();
    if (state.currentStream?.id === stream.id) return; // Already selected
    
    set({ currentStream: stream, currentTopic: null, messages: [] });
    get().fetchTopics(stream.id);
  },

  selectTopic: (topic) => {
    const { currentStream } = get();
    set({ currentTopic: topic, messages: [] }); // Reset messages for new topic
    if (currentStream) {
        get().clearUnreads(currentStream.id, topic);
    }
    get().fetchMessages();
  },

  fetchMessages: async (anchor = 'newest', isMore = false) => {
    const { currentStream, currentTopic, messages: existingMessages } = get();
    if (!currentStream || !currentTopic) return;

    if (!isMore) set({ isLoadingMessages: true });
    try {
      const messages = await messagesApi.getMessages({
        streamId: currentStream.id,
        topic: currentTopic,
        anchor: anchor.toString(),
        numBefore: 50,
        numAfter: 0
      });
      
      if (isMore) {
          // Filter out duplicates and prepend
          const newMsgs = messages.filter(nm => !existingMessages.some(em => em.id === nm.id));
          set({ messages: [...newMsgs, ...existingMessages] });
      } else {
          set({ messages });
          
          // If we got messages, mark them as read in Zulip
          if (messages.length > 0) {
              const unreadIds = messages.map(m => m.id);
              messagesApi.markAsRead(unreadIds).catch(console.error);
          }
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      if (!isMore) set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content) => {
    const { currentStream, currentTopic } = get();
    if (!currentStream || !currentTopic) return;

    try {
      await messagesApi.sendMessage({
        streamId: currentStream.id,
        topic: currentTopic,
        content
      });
      // No need to fetchMessages() here, the realtime event will add it
    } catch (error) {
      console.error('Failed to send message', error);
      throw error;
    }
  },

  addMessage: (message: any) => {
    const { messages, currentStream, currentTopic, unreadCounts } = get();
    
    const streamId = message.stream_id;
    const topic = message.subject;

    // Check if message is for CURRENT active topic
    const isForCurrent = currentStream?.id === streamId && currentTopic === topic;

    if (isForCurrent) {
        // De-duplicate
        if (messages.some(m => m.id === message.id)) return;
        set({ messages: [...messages, message] });
        // Mark as read in Zulip since we are looking at it
        messagesApi.markAsRead([message.id]).catch(console.error);
    } else {
        // Increment unread counts
        const newUnreads = { ...unreadCounts };
        
        // Count for the topic
        const topicKey = `${streamId}:${topic}`;
        newUnreads[topicKey] = (newUnreads[topicKey] || 0) + 1;
        
        // Count for the stream (total)
        const streamKey = `${streamId}`;
        newUnreads[streamKey] = (newUnreads[streamKey] || 0) + 1;

        set({ unreadCounts: newUnreads });
    }
  },

  clearUnreads: (streamId, topic) => {
      set((state) => {
          const newUnreads = { ...state.unreadCounts };
          if (topic) {
              const topicKey = `${streamId}:${topic}`;
              const topicCount = newUnreads[topicKey] || 0;
              delete newUnreads[topicKey];
              
              const streamKey = `${streamId}`;
              newUnreads[streamKey] = Math.max(0, (newUnreads[streamKey] || 0) - topicCount);
          } else {
              // Clear everything for this stream (rarely used here but good to have)
              const streamKey = `${streamId}`;
              delete newUnreads[streamKey];
              Object.keys(newUnreads).forEach(key => {
                  if (key.startsWith(`${streamId}:`)) delete newUnreads[key];
              });
          }
          return { unreadCounts: newUnreads };
      });
  },

  setUnreads: (unreadMsgs: any, baseUrl?: string) => {
      if (baseUrl) {
          set({ zulipBaseUrl: baseUrl });
          localStorage.setItem('zulipBaseUrl', baseUrl);
      }
      
      const newUnreads: Record<string, number> = {};
      
      if (unreadMsgs.streams) {
          unreadMsgs.streams.forEach((item: any) => {
              const streamId = item.stream_id;
              const topic = item.topic;
              const count = item.unread_message_ids.length;

              // Topic count
              newUnreads[`${streamId}:${topic}`] = count;

              // Accumulate stream total
              newUnreads[`${streamId}`] = (newUnreads[`${streamId}`] || 0) + count;
          });
      }
      set({ unreadCounts: newUnreads });
  }
}));
