// A single turn shown in the chat and sent back as history for follow-up questions.
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // Names of data tools the assistant ran to answer (assistant turns only).
  tools?: string[];
  // Streaming/failed flags for rendering.
  streaming?: boolean;
  error?: boolean;
}

export interface AssistantRequest {
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

// Events emitted by the SSE stream from POST /api/assistant/ask.
export type AssistantEvent =
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string; arguments: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
