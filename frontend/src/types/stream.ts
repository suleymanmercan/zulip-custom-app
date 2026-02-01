export interface Stream {
  id: number;
  name: string;
}

export interface Topic {
  name: string;
  max_message_id: number;
}
