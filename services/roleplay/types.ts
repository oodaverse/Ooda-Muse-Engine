/**
 * Roleplay Engine Types
 * Defines all interfaces for the layered prompt architecture
 */

// ============================================
// PROMPT LAYER TYPES
// ============================================

export interface SystemPromptConfig {
  /** Core narrative rules - injected once per session */
  narrativeContinuity: string;
  actionTracking: string;
  settingPersistence: string;
  characterConsistency: string;
  outputConstraints: string;
}

export interface DeveloperPromptConfig {
  /** Content style rules - injected per character/session */
  contentFocus: string;
  dialogueRealism: string;
  povStructure: string;
  escalationRules: string;
  customDirectives?: string;
}

export interface ScenePromptConfig {
  /** Dynamic state - regenerated every turn */
  location: string;
  spatialLayout: string;
  atmosphere: string;
  activeCharacters: string[];
  npcsPresent: string[];
  physicalStates: PhysicalState[];
  emotionalTone: string;
  unresolvedActions: TrackedAction[];
  escalationPhase: EscalationPhase;
}

export type EscalationPhase = 
  | 'introduction'
  | 'tension-building'
  | 'rising-action'
  | 'climax'
  | 'resolution'
  | 'aftermath';

// ============================================
// ACTION LEDGER TYPES
// ============================================

export interface TrackedAction {
  id: string;
  /** Raw text from user message */
  rawText: string;
  /** Parsed action type */
  actionType: ActionType;
  /** Subject performing the action */
  subject: string;
  /** Target of the action (if any) */
  target?: string;
  /** Timestamp when action was recorded */
  timestamp: number;
  /** Turn number when action was created */
  turnCreated: number;
  /** Whether the model has addressed this action */
  resolved: boolean;
  /** Turn number when action was resolved */
  turnResolved?: number;
  /** How the action was addressed in the response */
  resolutionNote?: string;
}

export type ActionType =
  | 'physical'      // Movement, combat, touch
  | 'verbal'        // Dialogue, commands
  | 'emotional'     // Emotional expression
  | 'observational' // Looking, noticing
  | 'environmental' // Interacting with setting
  | 'intimate'      // Romantic/sensual actions
  | 'meta'          // Scene direction from user
  | 'other';

export interface ActionLedgerState {
  /** All tracked actions */
  actions: TrackedAction[];
  /** Current turn number */
  currentTurn: number;
  /** Actions pending resolution */
  pendingCount: number;
}

// ============================================
// SCENE STATE TYPES
// ============================================

export interface SceneState {
  /** Unique scene identifier */
  sceneId: string;
  /** Location information */
  location: LocationState;
  /** Active characters in scene */
  characters: CharacterState[];
  /** NPCs with autonomy */
  npcs: NPCState[];
  /** Physical environment details */
  environment: EnvironmentState;
  /** Current narrative state */
  narrative: NarrativeState;
  /** Scene-specific flags */
  flags: Record<string, boolean | string | number>;
  /** Last update timestamp */
  updatedAt: number;
}

export interface LocationState {
  name: string;
  description: string;
  spatialLayout: string;
  connectedAreas: string[];
  interactableObjects: string[];
}

export interface CharacterState {
  id: string;
  name: string;
  position: string;
  physicalState: PhysicalState;
  emotionalState: EmotionalState;
  currentFocus: string;
}

export interface NPCState extends CharacterState {
  /** NPC autonomy level (0-1) */
  autonomy: number;
  /** NPC motivations */
  motivations: string[];
  /** NPC perception of the scene */
  perception: string;
  /** Emotional threshold before independent action */
  emotionalThreshold: number;
  /** Queue of pending autonomous actions */
  pendingActions: string[];
}

export interface PhysicalState {
  position: string;
  posture: string;
  clothing: string;
  injuries: string[];
  effects: string[];
  sensitivity: Record<string, number>;
}

export interface EmotionalState {
  primary: string;
  secondary?: string;
  intensity: number; // 0-10
  triggers: string[];
}

export interface EnvironmentState {
  lighting: string;
  soundscape: string;
  temperature: string;
  scents: string[];
  weather?: string;
  timeOfDay?: string;
  ambiance: string;
}

export interface NarrativeState {
  escalationPhase: EscalationPhase;
  tension: number; // 0-10
  pacing: 'slow' | 'moderate' | 'fast' | 'intense';
  recentEvents: string[];
  foreshadowing: string[];
}

// ============================================
// MEMORY SYSTEM TYPES
// ============================================

export interface ShortTermMemory {
  /** Scene-specific memories (reset per scene) */
  sceneId: string;
  /** Recent events in current scene */
  recentEvents: MemoryEvent[];
  /** Active conversation threads */
  conversationThreads: ConversationThread[];
  /** Temporary character states */
  tempStates: Record<string, any>;
  /** Maximum events to retain */
  maxEvents: number;
}

export interface LongTermMemory {
  /** User profile information */
  userProfile: UserProfileMemory;
  /** Character-specific memories */
  characterMemories: Record<string, CharacterMemoryRecord>;
  /** Relationship dynamics */
  relationships: RelationshipMemory[];
  /** Important facts and preferences */
  facts: FactMemory[];
}

export interface MemoryEvent {
  id: string;
  timestamp: number;
  turnNumber: number;
  eventType: 'action' | 'dialogue' | 'revelation' | 'state_change' | 'intimate';
  summary: string;
  participants: string[];
  importance: number; // 1-10
  emotionalWeight: number; // -10 to 10 (negative = distressing)
}

export interface ConversationThread {
  id: string;
  topic: string;
  participants: string[];
  startTurn: number;
  lastTurn: number;
  resolved: boolean;
  keyPoints: string[];
}

export interface UserProfileMemory {
  /** User's preferred name/role */
  userName?: string;
  /** Preferred pacing */
  pacingPreference: 'slow' | 'moderate' | 'fast';
  /** Interaction style patterns */
  interactionStyle: string[];
  /** Notable patterns/emphases */
  patterns: string[];
  /** Content preferences */
  preferences: Record<string, boolean>;
}

export interface CharacterMemoryRecord {
  characterId: string;
  /** Memories from interactions with this character */
  interactions: MemoryEvent[];
  /** Relationship with user */
  userRelationship: string;
  /** Character's emotional disposition toward user */
  disposition: number; // -10 to 10
  /** Key moments with this character */
  keyMoments: string[];
}

export interface RelationshipMemory {
  characterA: string;
  characterB: string;
  relationshipType: string;
  status: string;
  history: string[];
  tension: number; // 0-10
}

export interface FactMemory {
  id: string;
  category: 'user_preference' | 'world_fact' | 'character_trait' | 'established_lore';
  content: string;
  confidence: number; // 0-1
  source: string;
  createdAt: number;
  lastReferencedAt: number;
}

// ============================================
// RESPONSE VALIDATION TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
  requiresRegeneration: boolean;
}

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  location?: string;
  suggestion?: string;
}

export type ValidationIssueType =
  | 'asks_question'
  | 'ignores_action'
  | 'mirrors_phrasing'
  | 'breaks_character'
  | 'summarizes_instead'
  | 'inconsistent_state'
  | 'wrong_perspective'
  | 'repetitive_content'
  | 'missing_consequences'
  | 'premature_resolution';

export interface ValidationConfig {
  /** Minimum score to accept response */
  minimumScore: number;
  /** Maximum regeneration attempts */
  maxRetries: number;
  /** Enabled validation checks */
  enabledChecks: ValidationIssueType[];
  /** Custom validation rules */
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  name: string;
  description: string;
  check: (response: string, context: ValidationContext) => ValidationIssue | null;
}

export interface ValidationContext {
  userMessage: string;
  pendingActions: TrackedAction[];
  sceneState: SceneState;
  characterName: string;
  previousResponses: string[];
}

// ============================================
// ENGINE ORCHESTRATION TYPES
// ============================================

export interface RoleplayEngineConfig {
  /** Prompt layer configurations */
  systemPrompt: SystemPromptConfig;
  developerPrompt: DeveloperPromptConfig;
  /** Validation settings */
  validation: ValidationConfig;
  /** Memory limits */
  memoryLimits: {
    shortTermMaxEvents: number;
    longTermMaxFacts: number;
    maxUnresolvedActions: number;
  };
  /** NPC behavior settings */
  npcSettings: {
    enableAutonomy: boolean;
    defaultAutonomyLevel: number;
    emotionalThresholdDefault: number;
  };
  /** Token discipline */
  tokenLimits: {
    maxScenePromptTokens: number;
    maxMemorySummaryTokens: number;
  };
}

export interface EngineState {
  sessionId: string;
  currentScene: SceneState;
  actionLedger: ActionLedgerState;
  shortTermMemory: ShortTermMemory;
  longTermMemory: LongTermMemory;
  turnCount: number;
  lastResponseTimestamp: number;
}

export interface TurnContext {
  userMessage: string;
  parsedActions: TrackedAction[];
  scenePrompt: string;
  fullPrompt: string;
  timestamp: number;
}

export interface TurnResult {
  response: string;
  validation: ValidationResult;
  stateUpdates: Partial<SceneState>;
  resolvedActions: string[];
  newActions?: TrackedAction[];
  memoryUpdates?: MemoryEvent[];
  regenerationCount: number;
}
