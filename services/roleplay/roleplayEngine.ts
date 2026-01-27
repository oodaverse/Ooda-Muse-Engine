/**
 * Roleplay Engine
 * Main orchestrator that coordinates all roleplay subsystems
 */

import {
  RoleplayEngineConfig,
  EngineState,
  TurnContext,
  TurnResult,
  SceneState,
  TrackedAction,
  ValidationContext,
  MemoryEvent,
  EscalationPhase,
  CharacterState,
  NPCState,
} from './types';

import {
  PromptLayerManager,
  createPromptLayerManager,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_DEVELOPER_PROMPT,
} from './promptLayerManager';

import {
  ActionLedger,
  createActionLedger,
} from './actionLedger';

import {
  SceneStateManager,
  createSceneStateManager,
  parseStateUpdatesFromResponse,
} from './sceneStateManager';

import {
  ShortTermMemoryManager,
  LongTermMemoryManager,
  UserPatternAnalyzer,
  createShortTermMemory,
  createLongTermMemory,
  createUserPatternAnalyzer,
} from './memorySystem';

import {
  ResponseValidator,
  createResponseValidator,
  generateRegenerationGuidance,
  buildRegenerationPrompt,
  DEFAULT_VALIDATION_CONFIG,
} from './responseValidator';

// ============================================
// DEFAULT ENGINE CONFIGURATION
// ============================================

export const DEFAULT_ENGINE_CONFIG: RoleplayEngineConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  developerPrompt: DEFAULT_DEVELOPER_PROMPT,
  validation: DEFAULT_VALIDATION_CONFIG,
  memoryLimits: {
    shortTermMaxEvents: 50,
    longTermMaxFacts: 100,
    maxUnresolvedActions: 20,
  },
  npcSettings: {
    enableAutonomy: true,
    defaultAutonomyLevel: 0.5,
    emotionalThresholdDefault: 7,
  },
  tokenLimits: {
    maxScenePromptTokens: 500,
    maxMemorySummaryTokens: 200,
  },
};

// ============================================
// ROLEPLAY ENGINE CLASS
// ============================================

export class RoleplayEngine {
  private config: RoleplayEngineConfig;
  private promptManager: PromptLayerManager;
  private actionLedger: ActionLedger;
  private sceneManager: SceneStateManager;
  private shortTermMemory: ShortTermMemoryManager;
  private longTermMemory: LongTermMemoryManager;
  private patternAnalyzer: UserPatternAnalyzer;
  private validator: ResponseValidator;
  
  private sessionId: string;
  private turnCount: number = 0;
  private lastResponse: string = '';
  private responseHistory: string[] = [];
  private currentCharacterId: string | null = null;
  private currentCharacterName: string = '';

  constructor(config: Partial<RoleplayEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.sessionId = this.generateId();

    // Initialize subsystems
    this.promptManager = createPromptLayerManager(
      this.config.systemPrompt,
      this.config.developerPrompt
    );
    this.actionLedger = createActionLedger(this.config.memoryLimits.maxUnresolvedActions);
    this.sceneManager = createSceneStateManager();
    this.shortTermMemory = createShortTermMemory(
      this.sceneManager.getState().sceneId,
      this.config.memoryLimits.shortTermMaxEvents
    );
    this.longTermMemory = createLongTermMemory(
      'rp_long_term_memory',
      this.config.memoryLimits.longTermMaxFacts
    );
    this.patternAnalyzer = createUserPatternAnalyzer();
    this.validator = createResponseValidator(this.config.validation);
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  getSessionId(): string {
    return this.sessionId;
  }

  getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Set the active character for the session
   */
  setCharacter(characterId: string, characterName: string): void {
    this.currentCharacterId = characterId;
    this.currentCharacterName = characterName;
    
    // Initialize long-term memory for this character
    this.longTermMemory.initializeCharacterMemory(characterId);
    
    // Add character to scene
    this.sceneManager.addCharacter({
      id: characterId,
      name: characterName,
    });
  }

  /**
   * Start a new scene (resets short-term memory and action ledger)
   */
  newScene(options: {
    location?: string;
    description?: string;
    atmosphere?: string;
    preserveCharacters?: boolean;
  } = {}): void {
    // Reset scene state
    this.sceneManager.newScene({
      location: options.location ? {
        name: options.location,
        description: options.description || '',
        spatialLayout: '',
        connectedAreas: [],
        interactableObjects: [],
      } : undefined,
      preserveCharacters: options.preserveCharacters,
    });

    if (options.atmosphere) {
      this.sceneManager.updateEnvironment({ ambiance: options.atmosphere });
    }

    // Reset short-term memory
    this.shortTermMemory.reset(this.sceneManager.getState().sceneId);
    
    // Clear action ledger
    this.actionLedger.clear();
    
    // Reset response history
    this.responseHistory = [];
    this.lastResponse = '';
    
    // Keep turn count for session continuity
  }

  // ============================================
  // MAIN TURN PROCESSING
  // ============================================

  /**
   * Process a user message and prepare context for generation
   */
  prepareTurn(userMessage: string): TurnContext {
    this.turnCount++;
    this.actionLedger.advanceTurn();
    
    // Parse user message for actions
    const parsedActions = this.actionLedger.parseUserMessage(userMessage);
    this.actionLedger.trackActions(parsedActions);
    
    // Add user message to pattern analyzer
    this.patternAnalyzer.addMessage(userMessage);
    
    // Get current state
    const sceneState = this.sceneManager.getState();
    const pendingActions = this.actionLedger.getPendingActions();
    const userProfile = this.longTermMemory.getUserProfile();
    
    // Build scene prompt
    const scenePrompt = this.promptManager.buildTokenEfficientScenePrompt(
      sceneState,
      pendingActions,
      this.config.tokenLimits.maxScenePromptTokens
    );

    // Build full prompt (system + developer + scene)
    const fullPrompt = this.promptManager.buildFullPrompt(
      this.currentCharacterName || 'Character',
      '', // Character description added separately
      '', // Character personality added separately
      sceneState,
      pendingActions,
      userProfile
    );

    return {
      userMessage,
      parsedActions,
      scenePrompt,
      fullPrompt,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the system prompt for injection into API call
   */
  getSystemPrompt(): string {
    return this.promptManager.buildSystemPrompt();
  }

  /**
   * Get the developer prompt for injection into API call
   */
  getDeveloperPrompt(customDirectives?: string): string {
    return this.promptManager.buildDeveloperPrompt(customDirectives);
  }

  /**
   * Get the scene prompt for injection into API call
   */
  getScenePrompt(): string {
    const sceneState = this.sceneManager.getState();
    const pendingActions = this.actionLedger.getPendingActions();
    const userProfile = this.longTermMemory.getUserProfile();
    
    return this.promptManager.buildScenePrompt(
      sceneState,
      pendingActions,
      userProfile
    );
  }

  /**
   * Get all pending actions formatted for prompt
   */
  getPendingActionsPrompt(): string {
    return this.actionLedger.getPendingActionsForPrompt();
  }

  // ============================================
  // RESPONSE PROCESSING
  // ============================================

  /**
   * Process and validate an AI response
   */
  processResponse(response: string, context: TurnContext): TurnResult {
    const validationContext: ValidationContext = {
      userMessage: context.userMessage,
      pendingActions: context.parsedActions,
      sceneState: this.sceneManager.getState(),
      characterName: this.currentCharacterName,
      previousResponses: this.responseHistory.slice(-3),
    };

    // Validate response
    const validation = this.validator.validate(response, validationContext);
    
    // Auto-resolve actions based on response
    const resolvedActionIds = this.actionLedger.autoResolveFromResponse(response);
    
    // Parse state updates from response
    const stateUpdates = parseStateUpdatesFromResponse(response);
    
    // Apply state updates
    this.applyStateUpdates(stateUpdates, context.parsedActions);
    
    // Store response in history
    this.responseHistory.push(response);
    if (this.responseHistory.length > 10) {
      this.responseHistory.shift();
    }
    this.lastResponse = response;
    
    // Add to short-term memory
    const memoryEvent = this.shortTermMemory.addEvent({
      turnNumber: this.turnCount,
      eventType: 'action',
      summary: this.summarizeExchange(context.userMessage, response),
      participants: [this.currentCharacterName, 'user'],
      importance: this.calculateEventImportance(context, response),
      emotionalWeight: this.calculateEmotionalWeight(response),
    });
    
    // Update long-term memory if significant
    if (memoryEvent.importance >= 7 && this.currentCharacterId) {
      this.longTermMemory.addCharacterInteraction(this.currentCharacterId, memoryEvent);
    }

    // Update user profile patterns periodically
    if (this.turnCount % 5 === 0) {
      this.updateUserPatterns();
    }

    return {
      response,
      validation,
      stateUpdates: this.sceneManager.getState(),
      resolvedActions: resolvedActionIds,
      newActions: context.parsedActions,
      memoryUpdates: [memoryEvent],
      regenerationCount: 0,
    };
  }

  /**
   * Get regeneration guidance if response failed validation
   */
  getRegenerationGuidance(validation: TurnResult['validation']): string | null {
    if (validation.valid) return null;
    
    const guidance = generateRegenerationGuidance(validation.issues);
    return buildRegenerationPrompt(guidance);
  }

  // ============================================
  // STATE UPDATE HELPERS
  // ============================================

  private applyStateUpdates(
    updates: ReturnType<typeof parseStateUpdatesFromResponse>,
    actions: TrackedAction[]
  ): void {
    // Apply tension changes
    if (updates.tensionDelta) {
      this.sceneManager.adjustTension(updates.tensionDelta);
    }

    // Apply emotional changes to characters
    if (updates.emotionalChanges) {
      for (const change of updates.emotionalChanges) {
        const character = this.sceneManager.getCharacters().find(
          c => c.name.toLowerCase() === change.name.toLowerCase()
        );
        if (character) {
          this.sceneManager.updateCharacter(character.id, {
            emotionalState: {
              primary: change.emotion,
              intensity: change.intensity || 5,
              triggers: [],
            },
          });
        }
      }
    }

    // Auto-escalate based on action types
    const hasIntimateActions = actions.some(a => a.actionType === 'intimate');
    if (hasIntimateActions) {
      this.progressEscalation();
    }

    // Add recent event summary
    const eventSummary = `Turn ${this.turnCount}: ${actions.map(a => a.rawText).join('; ')}`;
    this.sceneManager.addRecentEvent(eventSummary);
  }

  private progressEscalation(): void {
    const currentPhase = this.sceneManager.getNarrative().escalationPhase;
    const phaseOrder: EscalationPhase[] = [
      'introduction',
      'tension-building',
      'rising-action',
      'climax',
      'resolution',
      'aftermath',
    ];
    
    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex < phaseOrder.length - 1 && currentIndex < 3) {
      // Only auto-progress up to climax
      this.sceneManager.setEscalationPhase(phaseOrder[currentIndex + 1]);
    }
  }

  private summarizeExchange(userMessage: string, response: string): string {
    // Create a brief summary of the exchange
    const userBrief = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
    const responseBrief = response.substring(0, 50) + (response.length > 50 ? '...' : '');
    return `User: ${userBrief} → Response: ${responseBrief}`;
  }

  private calculateEventImportance(context: TurnContext, response: string): number {
    let importance = 5; // Base importance

    // Increase for intimate actions
    if (context.parsedActions.some(a => a.actionType === 'intimate')) {
      importance += 2;
    }

    // Increase for emotional actions
    if (context.parsedActions.some(a => a.actionType === 'emotional')) {
      importance += 1;
    }

    // Increase for long responses (more narrative content)
    if (response.length > 1000) {
      importance += 1;
    }

    // Increase for dialogue-heavy responses
    const dialogueCount = (response.match(/"/g) || []).length / 2;
    if (dialogueCount > 3) {
      importance += 1;
    }

    return Math.min(10, importance);
  }

  private calculateEmotionalWeight(response: string): number {
    let weight = 0;
    
    // Positive indicators
    if (/\b(joy|happy|love|excitement|pleasure|delight)\b/i.test(response)) {
      weight += 3;
    }
    
    // Negative indicators
    if (/\b(fear|anger|sadness|pain|distress|anxiety)\b/i.test(response)) {
      weight -= 3;
    }
    
    // Neutral/mixed
    if (/\b(confusion|uncertainty|anticipation)\b/i.test(response)) {
      weight += 0;
    }

    return Math.max(-10, Math.min(10, weight));
  }

  private updateUserPatterns(): void {
    const patterns = this.patternAnalyzer.analyzePatterns();
    
    this.longTermMemory.updateUserProfile({
      pacingPreference: patterns.pacingPreference,
    });
    
    patterns.interactionStyles.forEach(style => {
      this.longTermMemory.addInteractionStylePattern(style);
    });
    
    patterns.commonThemes.forEach(theme => {
      this.longTermMemory.addUserPattern(`Interested in: ${theme}`);
    });
  }

  // ============================================
  // SCENE STATE ACCESS
  // ============================================

  getSceneState(): SceneState {
    return this.sceneManager.getState();
  }

  updateLocation(location: Partial<SceneState['location']>): void {
    this.sceneManager.setLocation(location);
  }

  updateEnvironment(environment: Partial<SceneState['environment']>): void {
    this.sceneManager.updateEnvironment(environment);
  }

  setEscalationPhase(phase: EscalationPhase): void {
    this.sceneManager.setEscalationPhase(phase);
  }

  setTension(value: number): void {
    this.sceneManager.setTension(value);
  }

  setPacing(pacing: 'slow' | 'moderate' | 'fast' | 'intense'): void {
    this.sceneManager.setPacing(pacing);
  }

  // ============================================
  // NPC MANAGEMENT
  // ============================================

  addNPC(npc: Partial<NPCState> & { id: string; name: string }): void {
    this.sceneManager.addNPC({
      ...npc,
      autonomy: npc.autonomy ?? this.config.npcSettings.defaultAutonomyLevel,
      emotionalThreshold: npc.emotionalThreshold ?? this.config.npcSettings.emotionalThresholdDefault,
    });
  }

  updateNPC(npcId: string, updates: Partial<NPCState>): void {
    this.sceneManager.updateNPC(npcId, updates);
  }

  removeNPC(npcId: string): void {
    this.sceneManager.removeNPC(npcId);
  }

  /**
   * Get NPCs that should act autonomously this turn
   */
  getAutonomousNPCs(): NPCState[] {
    if (!this.config.npcSettings.enableAutonomy) return [];
    return this.sceneManager.checkNPCAutonomousTriggers();
  }

  /**
   * Queue an action for an NPC to take
   */
  queueNPCAction(npcId: string, action: string): void {
    this.sceneManager.queueNPCAction(npcId, action);
  }

  // ============================================
  // MEMORY ACCESS
  // ============================================

  getShortTermSummary(): string {
    return this.shortTermMemory.getCompactSummary();
  }

  getUserModelNotes(): string {
    return this.longTermMemory.getUserModelNotesForPrompt();
  }

  getCharacterMemorySummary(): string {
    if (!this.currentCharacterId) return '';
    return this.longTermMemory.getCharacterMemorySummary(this.currentCharacterId);
  }

  // ============================================
  // ACTION LEDGER ACCESS
  // ============================================

  getPendingActions(): TrackedAction[] {
    return this.actionLedger.getPendingActions();
  }

  getActionStatistics(): ReturnType<ActionLedger['getStatistics']> {
    return this.actionLedger.getStatistics();
  }

  forceResolveAllActions(reason: string): void {
    this.actionLedger.forceResolveAll(reason);
  }

  // ============================================
  // VALIDATION CONFIGURATION
  // ============================================

  setMinimumValidationScore(score: number): void {
    this.validator.updateConfig({ minimumScore: score });
  }

  enableValidationCheck(check: Parameters<typeof this.validator.enableCheck>[0]): void {
    this.validator.enableCheck(check);
  }

  disableValidationCheck(check: Parameters<typeof this.validator.disableCheck>[0]): void {
    this.validator.disableCheck(check);
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Export full engine state for persistence
   */
  exportState(): EngineState {
    return {
      sessionId: this.sessionId,
      currentScene: this.sceneManager.exportState(),
      actionLedger: this.actionLedger.exportState(),
      shortTermMemory: this.shortTermMemory.export(),
      longTermMemory: this.longTermMemory.export(),
      turnCount: this.turnCount,
      lastResponseTimestamp: Date.now(),
    };
  }

  /**
   * Import engine state from persistence
   */
  importState(state: EngineState): void {
    this.sessionId = state.sessionId;
    this.turnCount = state.turnCount;
    this.sceneManager.importState(state.currentScene);
    this.actionLedger.importState(state.actionLedger);
    this.shortTermMemory.import(state.shortTermMemory);
    this.longTermMemory.import(state.longTermMemory);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset the engine to initial state
   */
  reset(): void {
    this.sessionId = this.generateId();
    this.turnCount = 0;
    this.lastResponse = '';
    this.responseHistory = [];
    this.currentCharacterId = null;
    this.currentCharacterName = '';
    
    this.actionLedger.clear();
    this.sceneManager.reset();
    this.shortTermMemory.reset(this.sceneManager.getState().sceneId);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createRoleplayEngine(
  config?: Partial<RoleplayEngineConfig>
): RoleplayEngine {
  return new RoleplayEngine(config);
}

// ============================================
// SINGLETON INSTANCE (optional)
// ============================================

let defaultEngine: RoleplayEngine | null = null;

export function getDefaultEngine(): RoleplayEngine {
  if (!defaultEngine) {
    defaultEngine = createRoleplayEngine();
  }
  return defaultEngine;
}

export function resetDefaultEngine(): void {
  defaultEngine = null;
}
