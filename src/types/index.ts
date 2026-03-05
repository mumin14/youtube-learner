export interface FileRecord {
  id: number;
  filename: string;
  original_name: string;
  size_bytes: number;
  chunk_count: number;
  status: "uploaded" | "chunked" | "processing" | "completed" | "error";
  error_message: string | null;
  source_type: "file" | "youtube";
  youtube_url: string | null;
  video_id: string | null;
  share_token: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
}

export type YouTubeInputType = "video" | "playlist" | "channel" | "search";

export interface Chunk {
  id: number;
  file_id: number;
  chunk_index: number;
  content: string;
  token_estimate: number;
  processed: number;
  start_seconds: number | null;
  end_seconds: number | null;
  created_at: string;
}

export interface ActionItem {
  id: number;
  chunk_id: number;
  file_id: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  source_context: string | null;
  topic: string | null;
  timestamp_seconds: number | null;
  completed: number;
  completed_at: string | null;
  created_at: string;
  // joined fields
  filename?: string;
  source_type?: "file" | "youtube";
  video_id?: string | null;
  chunk_start_seconds?: number | null;
  chunk_end_seconds?: number | null;
}

export interface ActionItemSource {
  id: number;
  original_name: string;
  source_type: string;
  video_id: string | null;
  item_count: number;
}

export interface ProcessingJob {
  id: number;
  status: "pending" | "running" | "completed" | "error";
  total_chunks: number;
  processed_chunks: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingStatus {
  status: "idle" | "pending" | "running" | "completed" | "error";
  totalChunks: number;
  processedChunks: number;
  progress: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserRecord {
  id: number;
  email: string;
  stripe_customer_id: string;
  subscription_status:
    | "active"
    | "past_due"
    | "canceled"
    | "inactive"
    | "trialing";
  subscription_id: string | null;
  current_period_end: string | null;
  google_id: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  file_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  file_id: number | null;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
