/**
 * Roleplay Engine Module
 * 
 * A layered prompt architecture for immersive roleplay with:
 * - Three-tier prompt system (System, Developer, Scene)
 * - Action ledger for tracking and resolving user actions
 * - Scene state management for persistent world state
 * - Memory system (short-term scene, long-term character)
 * - Response validation and regeneration guidance
 * 
 * @example
 * ```typescript
 * import { createRoleplayEngine } from './services/roleplay';
 * 
 * // Create engine instance
 * const engine = createRoleplayEngine();
 * 
 * // Set up character
 * engine.setCharacter('char_123', 'Luna');
 * 
 * // Start a new scene
 * engine.newScene({
 *   location: 'A moonlit garden',
 *   atmosphere: 'romantic, mysterious',
 * });
 * 
 * // Process user turn
 * const context = engine.prepareTurn('*walks closer and reaches for her hand*');
 * 
 * // Get prompts for API call
 * const systemPrompt = engine.getSystemPrompt();
 * const developerPrompt = engine.getDeveloperPrompt();
 * const scenePrompt = engine.getScenePrompt();
 * 
 * // After getting AI response, process it
 * const result = engine.processResponse(aiResponse, context);
 * 
 * // Check if regeneration is needed
 * if (!result.validation.valid) {
 *   const guidance = engine.getRegenerationGuidance(result.validation);
 *   // Retry with guidance injected
 * }
 * ```
 */

// Types
export * from './types';

// Prompt Layer Manager
export {
  PromptLayerManager,
  createPromptLayerManager,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_DEVELOPER_PROMPT,
} from './promptLayerManager';

// Action Ledger
export {
  ActionLedger,
  createActionLedger,
} from './actionLedger';

// Scene State Manager
export {
  SceneStateManager,
  createSceneStateManager,
  createDefaultPhysicalState,
  createDefaultEmotionalState,
  createDefaultEnvironment,
  createDefaultNarrativeState,
  parseStateUpdatesFromResponse,
} from './sceneStateManager';

// Memory System
export {
  ShortTermMemoryManager,
  LongTermMemoryManager,
  UserPatternAnalyzer,
  createShortTermMemory,
  createLongTermMemory,
  createUserPatternAnalyzer,
  createDefaultUserProfile,
} from './memorySystem';

// Response Validator
export {
  ResponseValidator,
  createResponseValidator,
  generateRegenerationGuidance,
  buildRegenerationPrompt,
  DEFAULT_VALIDATION_CONFIG,
  CUSTOM_RULES,
} from './responseValidator';

// Main Engine
export {
  RoleplayEngine,
  createRoleplayEngine,
  getDefaultEngine,
  resetDefaultEngine,
  DEFAULT_ENGINE_CONFIG,
} from './roleplayEngine';

// Integration with existing services
export {
  getCharacterEngine,
  clearCharacterEngine,
  sendEnhancedMessage,
  setupScene,
  setSceneEscalation,
  setSceneTension,
  getSceneState,
  forceResolveActions,
  exportEngineState,
  importEngineState,
} from './integration';

// React Hook
export {
  useRoleplayEngine,
  getLoreContextForCharacter,
} from './useRoleplayEngine';
