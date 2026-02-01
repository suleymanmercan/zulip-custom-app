import apiClient from './client';
import type { Message, SendMessageRequest } from '@/types/message';

interface GetMessagesParams {
  streamId: number;
  topic: string;
  anchor?: string;
  numBefore?: number;
  numAfter?: number;
}

export const messagesApi = {
  getMessages: async (params: GetMessagesParams): Promise<Message[]> => {
    const response = await apiClient.get<{ messages: Message[] }>('/messages', { params });
    return response.data.messages;
  },

  sendMessage: async (data: SendMessageRequest): Promise<{ message_id: number }> => {
    const response = await apiClient.post<{ message_id: number }>('/messages', data);
    return response.data;
  },

  markAsRead: async (messageIds: number[]): Promise<void> => {
    await apiClient.post('/messages/flags/read', messageIds);
  }
};
