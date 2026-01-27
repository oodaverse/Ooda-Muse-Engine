/**
 * useRoleplayEngine Hook
 * 
 * React hook for integrating the roleplay engine with character chat components.
 * Provides a clean interface for the layered prompt system with action tracking,
 * scene state management, and response validation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Character, Message, Role, LoreEntry, ChatNode } from '../../types';
import { getSettings, getLorebooks, getLoreEntries } from '../storage';
import {
  RoleplayEngine,
  createRoleplayEngine,
  TurnResult,
  SceneState,
  EscalationPhase,
  TrackedAction,
} from './index';

// ============================================
// HOOK STATE INTERFACE
// ============================================

interface RoleplayEngineState {
  /** Whether the engine is initialized */
  isInitialized: boolean;
  /** Current scene state */
  sceneState: SceneState | null;
  /** Pending actions waiting for resolution */
  pendingActions: TrackedAction[];
  /** Current turn number */
  turnCount: number;
  /** Last validation result */
  lastValidation: TurnResult['validation'] | null;
  /** Whether we're currently processing */
  isProcessing: boolean;
}

interface UseRoleplayEngineReturn extends RoleplayEngineState {
  /** Initialize or reset the engine for a character */
  initializeEngine: (character: Character) => void;
  /** Process a user message and get the system prompt to use */
  prepareMessage: (userMessage: string) => {
    systemPrompt: string;
    scenePrompt: string;
    pendingActionsPrompt: string;
  };
  /** Process the AI response after generation */
  processResponse: (response: string, userMessage: string) => TurnResult;
  /** Start a new scene */
  newScene: (options?: {
    location?: string;
    description?: string;
    atmosphere?: string;
  }) => void;
  /** Update scene settings */
  updateScene: (updates: {
    location?: Partial<SceneState['location']>;
    environment?: Partial<SceneState['environment']>;
    tension?: number;
    escalation?: EscalationPhase;
    pacing?: 'slow' | 'moderate' | 'fast' | 'intense';
  }) => void;
  /** Force resolve all pending actions */
  forceResolveActions: (reason: string) => void;
  /** Get regeneration guidance if validation failed */
  getRegenerationGuidance: () => string | null;
  /** Build the complete system prompt for API call */
  buildFullSystemPrompt: (character: Character, loreContext: LoreEntry[]) => string;
}

// ============================================
// ENGINE STORAGE (per character)
// ============================================

const engineStore = new Map<string, RoleplayEngine>();

function getOrCreateEngine(characterId: string): RoleplayEngine {
  let engine = engineStore.get(characterId);
  if (!engine) {
    engine = createRoleplayEngine();
    engineStore.set(characterId, engine);
  }
  return engine;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useRoleplayEngine(characterId: string | null): UseRoleplayEngineReturn {
  const [state, setState] = useState<RoleplayEngineState>({
    isInitialized: false,
    sceneState: null,
    pendingActions: [],
    turnCount: 0,
    lastValidation: null,
    isProcessing: false,
  });

  const engineRef = useRef<RoleplayEngine | null>(null);
  const lastUserMessageRef = useRef<string>('');

  // Initialize engine when character changes
  useEffect(() => {
    if (!characterId) {
      engineRef.current = null;
      setState(prev => ({ ...prev, isInitialized: false, sceneState: null }));
      return;
    }

    const engine = getOrCreateEngine(characterId);
    engineRef.current = engine;
    
    setState({
      isInitialized: true,
      sceneState: engine.getSceneState(),
      pendingActions: engine.getPendingActions(),
      turnCount: engine.getTurnCount(),
      lastValidation: null,
      isProcessing: false,
    });
  }, [characterId]);

  const initializeEngine = useCallback((character: Character) => {
    if (!character) return;
    
    const engine = getOrCreateEngine(character.id);
    engine.setCharacter(character.id, character.name);
    engineRef.current = engine;
    
    setState({
      isInitialized: true,
      sceneState: engine.getSceneState(),
      pendingActions: engine.getPendingActions(),
      turnCount: engine.getTurnCount(),
      lastValidation: null,
      isProcessing: false,
    });
  }, []);

  const prepareMessage = useCallback((userMessage: string) => {
    const engine = engineRef.current;
    if (!engine) {
      return {
        systemPrompt: '',
        scenePrompt: '',
        pendingActionsPrompt: '',
      };
    }

    lastUserMessageRef.current = userMessage;
    engine.prepareTurn(userMessage);

    setState(prev => ({
      ...prev,
      pendingActions: engine.getPendingActions(),
      turnCount: engine.getTurnCount(),
      isProcessing: true,
    }));

    return {
      systemPrompt: engine.getSystemPrompt(),
      scenePrompt: engine.getScenePrompt(),
      pendingActionsPrompt: engine.getPendingActionsPrompt(),
    };
  }, []);

  const processResponse = useCallback((response: string, userMessage: string) => {
    const engine = engineRef.current;
    if (!engine) {
      throw new Error('Engine not initialized');
    }

    const context = engine.prepareTurn(userMessage);
    const result = engine.processResponse(response, context);

    setState(prev => ({
      ...prev,
      sceneState: engine.getSceneState(),
      pendingActions: engine.getPendingActions(),
      lastValidation: result.validation,
      isProcessing: false,
    }));

    return result;
  }, []);

  const newScene = useCallback((options?: {
    location?: string;
    description?: string;
    atmosphere?: string;
  }) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.newScene({
      location: options?.location,
      description: options?.description,
      atmosphere: options?.atmosphere,
      preserveCharacters: true,
    });

    setState(prev => ({
      ...prev,
      sceneState: engine.getSceneState(),
      pendingActions: [],
    }));
  }, []);

  const updateScene = useCallback((updates: {
    location?: Partial<SceneState['location']>;
    environment?: Partial<SceneState['environment']>;
    tension?: number;
    escalation?: EscalationPhase;
    pacing?: 'slow' | 'moderate' | 'fast' | 'intense';
  }) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (updates.location) {
      engine.updateLocation(updates.location);
    }
    if (updates.environment) {
      engine.updateEnvironment(updates.environment);
    }
    if (updates.tension !== undefined) {
      engine.setTension(updates.tension);
    }
    if (updates.escalation) {
      engine.setEscalationPhase(updates.escalation);
    }
    if (updates.pacing) {
      engine.setPacing(updates.pacing);
    }

    setState(prev => ({
      ...prev,
      sceneState: engine.getSceneState(),
    }));
  }, []);

  const forceResolveActions = useCallback((reason: string) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.forceResolveAllActions(reason);

    setState(prev => ({
      ...prev,
      pendingActions: [],
    }));
  }, []);

  const getRegenerationGuidance = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !state.lastValidation) return null;

    return engine.getRegenerationGuidance(state.lastValidation);
  }, [state.lastValidation]);

  const buildFullSystemPrompt = useCallback((character: Character, loreContext: LoreEntry[]) => {
    const engine = engineRef.current;
    if (!engine) return '';

    const settings = getSettings();
    const sections: string[] = [];

    // 1. Global system prompt from settings
    if (settings.globalSystemPrompt?.trim()) {
      sections.push(`=== GLOBAL INSTRUCTIONS ===\n${settings.globalSystemPrompt.trim()}`);
    }

    // 2. Roleplay engine system prompt (narrative rules)
    sections.push(engine.getSystemPrompt());

    // 3. Developer prompt (content style)
    sections.push(engine.getDeveloperPrompt());

    // 4. Character identity
    sections.push(buildCharacterSection(character, engine));

    // 5. Character memory (brain)
    if (character.brain) {
      sections.push(buildCharacterMemorySection(character));
    }

    // 6. Lore context
    if (loreContext.length > 0 && settings.autoInjectLore !== false) {
      const loreSection = buildLoreSection(loreContext, settings.loreImportanceThreshold || 5);
      if (loreSection) {
        sections.push(loreSection);
      }
    }

    // 7. Scene state (dynamic)
    sections.push(engine.getScenePrompt());

    // 8. Pending actions (critical)
    const pendingActions = engine.getPendingActionsPrompt();
    if (pendingActions) {
      sections.push(`=== CRITICAL: UNRESOLVED ACTIONS ===\n${pendingActions}`);
    }

    // 9. User model notes
    const userNotes = engine.getUserModelNotes();
    if (userNotes) {
      sections.push(`=== USER MODEL ===\n${userNotes}`);
    }

    // 10. Roleplay guidelines
    sections.push(buildRoleplayGuidelines(character.name));

    return sections.join('\n\n');
  }, []);

  return {
    ...state,
    initializeEngine,
    prepareMessage,
    processResponse,
    newScene,
    updateScene,
    forceResolveActions,
    getRegenerationGuidance,
    buildFullSystemPrompt,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildCharacterSection(character: Character, engine: RoleplayEngine): string {
  const lines = ['=== CHARACTER IDENTITY ==='];
  
  lines.push(`You are ${character.name}, a character in an immersive roleplay scenario.`);
  lines.push('');
  lines.push('CHARACTER PROFILE:');
  lines.push(`Name: ${character.name}`);
  
  if (character.description) {
    lines.push(`Description: ${character.description}`);
  }
  if (character.personality) {
    lines.push(`Personality: ${character.personality}`);
  }
  if (character.scenario) {
    lines.push(`Scenario: ${character.scenario}`);
  }

  // Add example dialogue
  if (character.mes_example) {
    lines.push('');
    lines.push('EXAMPLE DIALOGUE:');
    lines.push(character.mes_example);
  }

  return lines.join('\n');
}

function buildCharacterMemorySection(character: Character): string {
  if (!character.brain) return '';

  const lines = ['=== CHARACTER MEMORY ==='];
  lines.push('Use these memories as past experience. Do not contradict them.');

  if (character.brain.overviewMemory) {
    lines.push('');
    lines.push('OVERVIEW MEMORY:');
    lines.push(character.brain.overviewMemory);
  }

  if (character.brain.memoryBank && character.brain.memoryBank.length > 0) {
    lines.push('');
    lines.push('MEMORY BANK SUMMARIES:');
    character.brain.memoryBank.slice(-10).forEach((summary, idx) => {
      lines.push(`${idx + 1}. ${summary.content}`);
    });
  }

  if (character.brain.recentResponses && character.brain.recentResponses.length > 0) {
    lines.push('');
    lines.push('RECENT EXPERIENCES:');
    character.brain.recentResponses.slice(-15).forEach(chunk => {
      lines.push(`- ${chunk.content}`);
    });
  }

  return lines.join('\n');
}

function buildLoreSection(loreContext: LoreEntry[], threshold: number): string {
  const filtered = loreContext
    .filter(entry => entry.importance >= threshold)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  if (filtered.length === 0) return '';

  const lines = ['=== WORLD LORE & CONTEXT ==='];
  lines.push('The following lore entries are relevant to this conversation:');
  lines.push('');

  for (const entry of filtered) {
    lines.push(`[${entry.category.toUpperCase()}] ${entry.name} (Importance: ${entry.importance}/10)`);
    lines.push(entry.content);
    if (entry.keys.length > 0) {
      lines.push(`Keywords: ${entry.keys.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('IMPORTANT: Use this lore naturally when relevant. Build upon these details organically during roleplay.');

  return lines.join('\n');
}

function buildRoleplayGuidelines(characterName: string): string {
  return `=== ROLEPLAY GUIDELINES ===
- Stay in character at all times as ${characterName}
- Respond authentically based on ${characterName}'s personality, background, and emotional state
- Use ${characterName}'s speech patterns, vocabulary, and mannerisms consistently
- React emotionally as ${characterName} would, considering their history and relationships
- Make decisions and hold opinions that align with ${characterName}'s character
- Incorporate world lore seamlessly when contextually appropriate
- Never break character or acknowledge being an AI
- Be descriptive and immersive in your responses
- Do NOT narrate the user's actions or dialogue; only respond as ${characterName}
- Build upon the user's actions with new details that continue the story
- Offer actionable, adaptable details the user can accept or adjust`;
}

// ============================================
// UTILITY: Get lore context for character
// ============================================

export function getLoreContextForCharacter(character: Character): LoreEntry[] {
  const loreContext: LoreEntry[] = [];
  
  if (character.attachedLorebooks) {
    const lorebooks = getLorebooks();
    const loreEntries = getLoreEntries();
    
    character.attachedLorebooks.forEach(lorebookId => {
      const lorebook = lorebooks.find(b => b.id === lorebookId);
      if (lorebook) {
        lorebook.entries.forEach(entryId => {
          const entry = loreEntries.find(e => e.id === entryId);
          if (entry) loreContext.push(entry);
        });
      }
    });
  }
  
  return loreContext;
}
