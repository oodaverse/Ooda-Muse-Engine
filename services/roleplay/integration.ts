/**
 * Roleplay Engine Integration
 * 
 * This module provides integration between the RoleplayEngine and the existing
 * xaiService for seamless character chat with enhanced continuity and validation.
 */

import { Message, Role, Character, LoreEntry } from '../../types';
import { getSettings } from '../storage';
import {
  RoleplayEngine,
  createRoleplayEngine,
  TurnContext,
  TurnResult,
  SceneState,
  EscalationPhase,
} from './index';

// Provider configuration (mirrors xaiService)
const getProviderConfig = () => {
  const settings = getSettings();
  const provider = settings.provider || 'xai';
  
  if (provider === 'openrouter') {
    const apiKey = settings.openrouterApiKey || '';
    return {
      provider,
      apiKey,
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      model: settings.defaultModel,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Dreamweaver Oracle'
      }
    };
  }

  const apiKey = settings.apiKey || '';
  return {
    provider,
    apiKey,
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    model: settings.defaultModel || 'grok-3-latest',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };
};

// ============================================
// ENHANCED CHARACTER CHAT
// ============================================

interface EnhancedChatOptions {
  /** Custom developer prompt directives */
  customDirectives?: string;
  /** Whether to auto-regenerate on validation failure */
  autoRegenerate?: boolean;
  /** Maximum regeneration attempts */
  maxRetries?: number;
  /** Initial scene setup */
  sceneSetup?: {
    location?: string;
    description?: string;
    atmosphere?: string;
  };
}

interface EnhancedChatResult {
  /** The final response text */
  response: string;
  /** Full turn result with validation details */
  turnResult: TurnResult;
  /** Number of regeneration attempts */
  regenerationCount: number;
  /** Current scene state */
  sceneState: SceneState;
}

// Store engines per character
const characterEngines = new Map<string, RoleplayEngine>();

/**
 * Get or create a roleplay engine for a character
 */
export function getCharacterEngine(character: Character): RoleplayEngine {
  let engine = characterEngines.get(character.id);
  
  if (!engine) {
    engine = createRoleplayEngine();
    engine.setCharacter(character.id, character.name);
    characterEngines.set(character.id, engine);
  }
  
  return engine;
}

/**
 * Clear the engine for a character (for scene resets)
 */
export function clearCharacterEngine(characterId: string): void {
  const engine = characterEngines.get(characterId);
  if (engine) {
    engine.reset();
    characterEngines.delete(characterId);
  }
}

/**
 * Enhanced character chat with roleplay engine integration
 */
export async function sendEnhancedMessage(
  character: Character,
  history: Message[],
  userMessage: string,
  loreContext: LoreEntry[] = [],
  options: EnhancedChatOptions = {}
): Promise<EnhancedChatResult> {
  const settings = getSettings();
  const providerConfig = getProviderConfig();
  
  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error('API key is not configured. Please check your settings.');
  }

  // Get or create engine for this character
  const engine = getCharacterEngine(character);
  
  // Setup scene if provided
  if (options.sceneSetup) {
    engine.newScene({
      location: options.sceneSetup.location,
      description: options.sceneSetup.description,
      atmosphere: options.sceneSetup.atmosphere,
      preserveCharacters: true,
    });
  }

  // Prepare turn context
  const context = engine.prepareTurn(userMessage);
  
  // Build the complete system prompt
  const systemPrompt = buildIntegratedSystemPrompt(
    character,
    engine,
    loreContext,
    settings,
    options.customDirectives
  );

  let response = '';
  let turnResult: TurnResult | null = null;
  let regenerationCount = 0;
  const maxRetries = options.maxRetries ?? 2;

  // Generation loop with potential regeneration
  while (regenerationCount <= maxRetries) {
    // Build API messages
    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: userMessage }
    ];

    // Add regeneration guidance if this is a retry
    if (regenerationCount > 0 && turnResult) {
      const guidance = engine.getRegenerationGuidance(turnResult.validation);
      if (guidance) {
        apiMessages.push({
          role: 'system' as const,
          content: guidance
        });
      }
    }

    try {
      const apiResponse = await fetch(providerConfig.apiUrl, {
        method: 'POST',
        headers: providerConfig.headers,
        body: JSON.stringify({
          messages: apiMessages,
          model: providerConfig.model,
          stream: false,
          temperature: settings.temperature || 0.85,
          max_tokens: settings.maxTokens || 2000,
          top_p: 0.95
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API Error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      response = data.choices?.[0]?.message?.content?.trim() || '';

      if (!response) {
        throw new Error('Empty response from API');
      }

      // Process and validate response
      turnResult = engine.processResponse(response, context);

      // Check if regeneration is needed
      if (turnResult.validation.valid || !options.autoRegenerate) {
        break;
      }

      regenerationCount++;
      console.log(`Response validation failed, regenerating (attempt ${regenerationCount}/${maxRetries})`);

    } catch (error: any) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  if (!turnResult) {
    throw new Error('Failed to generate valid response');
  }

  return {
    response,
    turnResult,
    regenerationCount,
    sceneState: engine.getSceneState(),
  };
}

/**
 * Build the integrated system prompt combining all layers
 */
function buildIntegratedSystemPrompt(
  character: Character,
  engine: RoleplayEngine,
  loreContext: LoreEntry[],
  settings: ReturnType<typeof getSettings>,
  customDirectives?: string
): string {
  const sections: string[] = [];

  // 1. Global system prompt from settings
  if (settings.globalSystemPrompt?.trim()) {
    sections.push(`=== GLOBAL INSTRUCTIONS ===\n${settings.globalSystemPrompt.trim()}`);
  }

  // 2. Roleplay engine system prompt (narrative rules)
  sections.push(engine.getSystemPrompt());

  // 3. Developer prompt (content style)
  sections.push(engine.getDeveloperPrompt(customDirectives));

  // 4. Character identity and memory
  sections.push(buildCharacterSection(character, engine));

  // 5. Lore context
  if (loreContext.length > 0 && settings.autoInjectLore !== false) {
    sections.push(buildLoreSection(loreContext, settings.loreImportanceThreshold || 5));
  }

  // 6. Scene state (dynamic)
  sections.push(engine.getScenePrompt());

  // 7. Pending actions (critical)
  const pendingActions = engine.getPendingActionsPrompt();
  if (pendingActions) {
    sections.push(`=== CRITICAL: UNRESOLVED ACTIONS ===\n${pendingActions}`);
  }

  // 8. User model notes
  const userNotes = engine.getUserModelNotes();
  if (userNotes) {
    sections.push(`=== USER MODEL ===\n${userNotes}`);
  }

  return sections.join('\n\n');
}

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

  // Add character memory from engine
  const memorySummary = engine.getCharacterMemorySummary();
  if (memorySummary) {
    lines.push('');
    lines.push('CHARACTER MEMORY:');
    lines.push(memorySummary);
  }

  // Add example dialogue
  if (character.mes_example) {
    lines.push('');
    lines.push('EXAMPLE DIALOGUE:');
    lines.push(character.mes_example);
  }

  return lines.join('\n');
}

function buildLoreSection(loreContext: LoreEntry[], threshold: number): string {
  const filtered = loreContext
    .filter(entry => entry.importance >= threshold)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  if (filtered.length === 0) return '';

  const lines = ['=== WORLD LORE & CONTEXT ==='];
  
  for (const entry of filtered) {
    lines.push(`[${entry.category.toUpperCase()}] ${entry.name} (Importance: ${entry.importance}/10)`);
    lines.push(entry.content);
    if (entry.keys.length > 0) {
      lines.push(`Keywords: ${entry.keys.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// SCENE CONTROL API
// ============================================

/**
 * Set up a new scene for a character
 */
export function setupScene(
  characterId: string,
  scene: {
    location: string;
    description?: string;
    atmosphere?: string;
    npcs?: Array<{ id: string; name: string; description?: string }>;
  }
): void {
  const engine = characterEngines.get(characterId);
  if (!engine) {
    console.warn(`No engine found for character ${characterId}`);
    return;
  }

  engine.newScene({
    location: scene.location,
    description: scene.description,
    atmosphere: scene.atmosphere,
    preserveCharacters: true,
  });

  // Add NPCs if provided
  if (scene.npcs) {
    for (const npc of scene.npcs) {
      engine.addNPC({
        id: npc.id,
        name: npc.name,
      });
    }
  }
}

/**
 * Update the current scene's escalation phase
 */
export function setSceneEscalation(
  characterId: string,
  phase: EscalationPhase
): void {
  const engine = characterEngines.get(characterId);
  if (engine) {
    engine.setEscalationPhase(phase);
  }
}

/**
 * Update scene tension level
 */
export function setSceneTension(characterId: string, tension: number): void {
  const engine = characterEngines.get(characterId);
  if (engine) {
    engine.setTension(tension);
  }
}

/**
 * Get current scene state for a character
 */
export function getSceneState(characterId: string): SceneState | null {
  const engine = characterEngines.get(characterId);
  return engine ? engine.getSceneState() : null;
}

/**
 * Force resolve all pending actions (use sparingly)
 */
export function forceResolveActions(characterId: string, reason: string): void {
  const engine = characterEngines.get(characterId);
  if (engine) {
    engine.forceResolveAllActions(reason);
  }
}

// ============================================
// EXPORT ENGINE STATE
// ============================================

/**
 * Export the engine state for a character (for persistence)
 */
export function exportEngineState(characterId: string): ReturnType<RoleplayEngine['exportState']> | null {
  const engine = characterEngines.get(characterId);
  return engine ? engine.exportState() : null;
}

/**
 * Import engine state for a character
 */
export function importEngineState(
  characterId: string,
  state: ReturnType<RoleplayEngine['exportState']>
): void {
  let engine = characterEngines.get(characterId);
  if (!engine) {
    engine = createRoleplayEngine();
    characterEngines.set(characterId, engine);
  }
  engine.importState(state);
}
