export enum Role {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  characterId?: string;
}

// Roleplay Engine Types
export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  avatar?: string;
  gallery?: string[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  attachedLorebooks?: string[];
  brain?: CharacterBrain;
  data?: Record<string, any>;
}

export interface CharacterMemoryChunk {
  id: string;
  createdAt: number;
  content: string;
}

export interface CharacterMemorySummary {
  id: string;
  createdAt: number;
  content: string;
  sourceCount: number;
}

export interface CharacterBrain {
  recentResponses: CharacterMemoryChunk[];
  memoryBank: CharacterMemorySummary[];
  overviewMemory?: string;
  updatedAt: number;
}

export interface ChatNode {
  id: string;
  characterId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  isClosed?: boolean;
  compiledAt?: number;
}

export interface LoreEntry {
  id: string;
  name: string;
  content: string;
  keys: string[];
  category: 'character' | 'location' | 'event' | 'item' | 'concept' | 'other';
  importance: number;
  createdAt: number;
  updatedAt: number;
}

export interface Lorebook {
  id: string;
  name: string;
  description: string;
  entries: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  openrouterApiKey?: string;
  provider?: 'xai' | 'openrouter';
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  theme: 'dark' | 'light';
  globalSystemPrompt?: string;
  loreImportanceThreshold?: number;
  autoInjectLore?: boolean;
  customBonusPrompt?: string; // User-defined bonus prompt injected with every request
}

// Model definition for dynamic model selection
export interface AIModel {
  id: string;
  name: string;
  provider: 'xai' | 'openrouter';
  contextLength?: number;
  isNsfw?: boolean;
  description?: string;
  pricing?: string;
}

// Model test result for the Model Tester feature
export interface ModelTestResult {
  modelId: string;
  modelName: string;
  provider: 'xai' | 'openrouter';
  response: string;
  error?: string;
  duration?: number;
  timestamp: number;
}

export interface GalleryItem {
  id: string;
  characterId?: string;
  type: 'image' | 'video' | 'embed';
  name: string;
  blob?: Blob;
  embedCode?: string;
  embedUrl?: string;
  thumbnail?: string;
  createdAt: number;
  tags?: string[];
}

export interface ProposedLoreCard {
  id: string;
  name: string;
  content: string;
  category: 'character' | 'location' | 'event' | 'item' | 'concept' | 'other';
  keys: string[];
  importance: number;
}

export interface UserSettings {
  userName: string;
  avatarUrl?: string;
}

export enum ViewType {
  Dashboard = 'Dashboard',
  Characters = 'Characters',
  CharacterDetail = 'CharacterDetail',
  Chat = 'Chat',
  LoreWorld = 'LoreWorld',
  Settings = 'Settings',
  SharedProfile = 'SharedProfile',
}

export interface AiMode {
  id: string;
  name: string;
  description: string;
  iconName: string;
  systemInstruction: string;
  features: string[];
  isCustom: boolean;
}

// Legacy types for compatibility
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modeId?: string;
}

export enum ToolType {
  Workspace = 'Workspace',
  AgentModes = 'AgentModes',
  Research = 'Research',
  Compare = 'Compare',
  Tasks = 'Tasks',
  Calendar = 'Calendar',
  ImageGen = 'ImageGen',
  WebSearch = 'WebSearch',
  Coding = 'Coding',
  Notes = 'Notes',
  CreateMode = 'CreateMode',
  Brain = 'Brain',
}

export interface AgentMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Note {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  iconName: 'PenTool' | 'Briefcase' | 'GraduationCap' | 'CheckCircle2' | 'HeartHandshake' | 'Flower2' | 'Code2' | 'Bot' | 'Zap' | 'Brain' | 'Sparkles' | 'Ghost' | 'Gamepad2' | 'Music';
  features: string[];
  isCustom?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  context?: string; 
  tags: string[];
  isGlobal: boolean;
  chatId: string;
  createdAt: number;
  source: 'quick' | 'wizard' | 'manual';
}

export interface MemoryFact {
  id: string;
  category: 'user_profile' | 'preference' | 'coding_pattern' | 'fact';
  content: string;
  tags: string[];
  confidence: number;
  createdAt: number;
  sourceMessageId?: string;
}