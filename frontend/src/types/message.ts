export interface Message {
  id: number;
  sender_full_name: string;
  sender_email: string;
  timestamp: number;
  content: string; // HTML content from Zulip
}

export interface SendMessageRequest {
  streamId?: number;
  streamName?: string;
  topic: string;
  content: string;
}
