/**
 * API client for the backend. All requests go through the `/api` prefix
 * which is proxied to the backend by src/server.ts.
 */

export type Reaction = {
  id: number;
  timestamp: number;
  type: string;
  intensity: number;
  confidence: number;
  /** Breaths per minute from SmartSpectra, when it was measured. */
  breathing_rate?: number | null;
};

export type Session = {
  id: string;
  name?: string;
  video_url?: string;
  created_at: string;
  reaction_count: number;
};

export type Moment = {
  timestamp: number;
  type: string;
  intensity: number;
  confidence: number;
  score: number;
};

export type Shift = {
  timestamp: number;
  type: string;
  intensity: number;
  from_timestamp: number;
  from_type: string;
  delta: number;
};

export type Summary = {
  reaction_count: number;
  duration: number;
  dominant_emotion?: string;
  average_intensity: number;
  overall_sentiment: number;
  counts_by_type: Record<string, number>;
  average_breathing_rate?: number | null;
};

export type Insights = {
  most_positive?: Moment;
  biggest_reaction?: Moment;
  most_negative_shift?: Shift;
  top_5: Moment[];
  summary: Summary;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  answer: string;
  timestamps: number[];
  tools_used: string[];
  mode: "llm" | "fallback";
};

// Session endpoints

export async function listSessions(): Promise<Session[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.statusText}`);
  return res.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to get session: ${res.statusText}`);
  return res.json();
}

export async function createSession(data: {
  id?: string;
  name?: string;
  video_url?: string;
  reactions?: Array<{ timestamp: number; type: string; intensity: number; confidence: number }>;
}): Promise<Session> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete session: ${res.statusText}`);
}

export async function uploadVideo(
  file: File,
): Promise<{ filename: string; original_name: string; video_url: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/sessions/upload-video", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to upload video: ${res.statusText}`);
  }
  return res.json();
}

// Reactions endpoints

export async function getReactions(
  sessionId: string,
  startTime?: number,
  endTime?: number,
): Promise<Reaction[]> {
  const params = new URLSearchParams();
  if (startTime !== undefined) params.append("start_time", String(startTime));
  if (endTime !== undefined) params.append("end_time", String(endTime));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/sessions/${sessionId}/reactions${query}`);
  if (!res.ok) throw new Error(`Failed to get reactions: ${res.statusText}`);
  return res.json();
}

export async function submitReactions(
  sessionId: string,
  reactions: Array<{
    timestamp: number;
    type: string;
    intensity: number;
    confidence: number;
    breathing_rate?: number | null;
  }>,
): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/reactions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(reactions),
  });
  if (!res.ok) throw new Error(`Failed to submit reactions: ${res.statusText}`);
}

// Insights endpoint

export async function getInsights(sessionId: string): Promise<Insights> {
  const res = await fetch(`/api/sessions/${sessionId}/insights`);
  if (!res.ok) throw new Error(`Failed to get insights: ${res.statusText}`);
  return res.json();
}

// Chat endpoint

export async function sendChatMessage(
  sessionId: string,
  message: string,
  history: ChatMessage[] = [],
): Promise<ChatResponse> {
  const res = await fetch(`/api/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`Failed to send chat message: ${res.statusText}`);
  return res.json();
}
