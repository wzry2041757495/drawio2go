export type ProviderType = 'openai' | 'openai-response' | 'deepseek' | 'anthropic';

export interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  temperature: number;
  modelName: string;
  systemPrompt: string;
  providerType: ProviderType;
  maxToolRounds: number;
}

export type ToolInvocationState = 'call' | 'result';

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  state: ToolInvocationState;
  result?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: ToolInvocation[];
  createdAt?: Date;
}
