import apiClient from './client';
import type { Stream, Topic } from '@/types/stream';

export const streamsApi = {
  getStreams: async (): Promise<Stream[]> => {
    const response = await apiClient.get<{ streams: Stream[] }>('/streams');
    return response.data.streams;
  },

  getTopics: async (streamId: number): Promise<Topic[]> => {
    const response = await apiClient.get<{ topics: Topic[] }>(`/streams/${streamId}/topics`);
    return response.data.topics;
  }
};
