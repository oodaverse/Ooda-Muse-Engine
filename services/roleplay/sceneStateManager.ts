/**
 * Scene State Manager
 * Manages persistent scene state including location, characters, NPCs, and narrative state
 */

import {
  SceneState,
  LocationState,
  CharacterState,
  NPCState,
  EnvironmentState,
  NarrativeState,
  PhysicalState,
  EmotionalState,
  EscalationPhase,
} from './types';

// ============================================
// DEFAULT STATES
// ============================================

export const createDefaultPhysicalState = (): PhysicalState => ({
  position: 'standing',
  posture: 'relaxed',
  clothing: 'clothed',
  injuries: [],
  effects: [],
  sensitivity: {},
});

export const createDefaultEmotionalState = (): EmotionalState => ({
  primary: 'neutral',
  intensity: 5,
  triggers: [],
});

export const createDefaultEnvironment = (): EnvironmentState => ({
  lighting: 'ambient',
  soundscape: 'quiet',
  temperature: 'comfortable',
  scents: [],
  ambiance: 'neutral',
});

export const createDefaultNarrativeState = (): NarrativeState => ({
  escalationPhase: 'introduction',
  tension: 3,
  pacing: 'moderate',
  recentEvents: [],
  foreshadowing: [],
});

// ============================================
// SCENE STATE MANAGER CLASS
// ============================================

export class SceneStateManager {
  private state: SceneState;
  private stateHistory: SceneState[] = [];
  private maxHistorySize: number = 10;

  constructor(initialState?: Partial<SceneState>) {
    this.state = this.createDefaultState(initialState);
  }

  private createDefaultState(overrides?: Partial<SceneState>): SceneState {
    return {
      sceneId: this.generateId(),
      location: {
        name: 'Unspecified',
        description: '',
        spatialLayout: '',
        connectedAreas: [],
        interactableObjects: [],
      },
      characters: [],
      npcs: [],
      environment: createDefaultEnvironment(),
      narrative: createDefaultNarrativeState(),
      flags: {},
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  private generateId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // STATE ACCESS
  // ============================================

  getState(): SceneState {
    return JSON.parse(JSON.stringify(this.state));
  }

  getLocation(): LocationState {
    return { ...this.state.location };
  }

  getCharacters(): CharacterState[] {
    return [...this.state.characters];
  }

  getNPCs(): NPCState[] {
    return [...this.state.npcs];
  }

  getEnvironment(): EnvironmentState {
    return { ...this.state.environment };
  }

  getNarrative(): NarrativeState {
    return { ...this.state.narrative };
  }

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================

  setLocation(location: Partial<LocationState>): void {
    this.saveHistory();
    this.state.location = {
      ...this.state.location,
      ...location,
    };
    this.state.updatedAt = Date.now();
  }

  updateLocation(updates: Partial<LocationState>): void {
    this.setLocation(updates);
  }

  addInteractableObject(object: string): void {
    if (!this.state.location.interactableObjects.includes(object)) {
      this.saveHistory();
      this.state.location.interactableObjects.push(object);
      this.state.updatedAt = Date.now();
    }
  }

  removeInteractableObject(object: string): void {
    const index = this.state.location.interactableObjects.indexOf(object);
    if (index > -1) {
      this.saveHistory();
      this.state.location.interactableObjects.splice(index, 1);
      this.state.updatedAt = Date.now();
    }
  }

  // ============================================
  // CHARACTER MANAGEMENT
  // ============================================

  addCharacter(character: Partial<CharacterState> & { id: string; name: string }): void {
    const existing = this.state.characters.find(c => c.id === character.id);
    if (existing) {
      this.updateCharacter(character.id, character);
      return;
    }

    this.saveHistory();
    this.state.characters.push({
      id: character.id,
      name: character.name,
      position: character.position || 'present',
      physicalState: character.physicalState || createDefaultPhysicalState(),
      emotionalState: character.emotionalState || createDefaultEmotionalState(),
      currentFocus: character.currentFocus || '',
    });
    this.state.updatedAt = Date.now();
  }

  updateCharacter(characterId: string, updates: Partial<CharacterState>): void {
    const index = this.state.characters.findIndex(c => c.id === characterId);
    if (index === -1) return;

    this.saveHistory();
    this.state.characters[index] = {
      ...this.state.characters[index],
      ...updates,
      physicalState: updates.physicalState 
        ? { ...this.state.characters[index].physicalState, ...updates.physicalState }
        : this.state.characters[index].physicalState,
      emotionalState: updates.emotionalState
        ? { ...this.state.characters[index].emotionalState, ...updates.emotionalState }
        : this.state.characters[index].emotionalState,
    };
    this.state.updatedAt = Date.now();
  }

  removeCharacter(characterId: string): void {
    const index = this.state.characters.findIndex(c => c.id === characterId);
    if (index > -1) {
      this.saveHistory();
      this.state.characters.splice(index, 1);
      this.state.updatedAt = Date.now();
    }
  }

  getCharacter(characterId: string): CharacterState | undefined {
    return this.state.characters.find(c => c.id === characterId);
  }

  // ============================================
  // NPC MANAGEMENT
  // ============================================

  addNPC(npc: Partial<NPCState> & { id: string; name: string }): void {
    const existing = this.state.npcs.find(n => n.id === npc.id);
    if (existing) {
      this.updateNPC(npc.id, npc);
      return;
    }

    this.saveHistory();
    this.state.npcs.push({
      id: npc.id,
      name: npc.name,
      position: npc.position || 'present',
      physicalState: npc.physicalState || createDefaultPhysicalState(),
      emotionalState: npc.emotionalState || createDefaultEmotionalState(),
      currentFocus: npc.currentFocus || '',
      autonomy: npc.autonomy ?? 0.5,
      motivations: npc.motivations || [],
      perception: npc.perception || '',
      emotionalThreshold: npc.emotionalThreshold ?? 7,
      pendingActions: npc.pendingActions || [],
    });
    this.state.updatedAt = Date.now();
  }

  updateNPC(npcId: string, updates: Partial<NPCState>): void {
    const index = this.state.npcs.findIndex(n => n.id === npcId);
    if (index === -1) return;

    this.saveHistory();
    this.state.npcs[index] = {
      ...this.state.npcs[index],
      ...updates,
      physicalState: updates.physicalState
        ? { ...this.state.npcs[index].physicalState, ...updates.physicalState }
        : this.state.npcs[index].physicalState,
      emotionalState: updates.emotionalState
        ? { ...this.state.npcs[index].emotionalState, ...updates.emotionalState }
        : this.state.npcs[index].emotionalState,
    };
    this.state.updatedAt = Date.now();
  }

  removeNPC(npcId: string): void {
    const index = this.state.npcs.findIndex(n => n.id === npcId);
    if (index > -1) {
      this.saveHistory();
      this.state.npcs.splice(index, 1);
      this.state.updatedAt = Date.now();
    }
  }

  getNPC(npcId: string): NPCState | undefined {
    return this.state.npcs.find(n => n.id === npcId);
  }

  /**
   * Check if any NPC should take autonomous action
   */
  checkNPCAutonomousTriggers(): NPCState[] {
    return this.state.npcs.filter(npc => {
      // NPC acts autonomously if:
      // 1. They have high autonomy
      // 2. Their emotional state exceeds their threshold
      // 3. They have pending actions
      return (
        npc.autonomy >= 0.7 ||
        npc.emotionalState.intensity >= npc.emotionalThreshold ||
        npc.pendingActions.length > 0
      );
    });
  }

  /**
   * Queue an autonomous action for an NPC
   */
  queueNPCAction(npcId: string, action: string): void {
    const npc = this.state.npcs.find(n => n.id === npcId);
    if (npc) {
      this.saveHistory();
      npc.pendingActions.push(action);
      this.state.updatedAt = Date.now();
    }
  }

  /**
   * Clear NPC pending actions (after they've been processed)
   */
  clearNPCActions(npcId: string): void {
    const npc = this.state.npcs.find(n => n.id === npcId);
    if (npc) {
      this.saveHistory();
      npc.pendingActions = [];
      this.state.updatedAt = Date.now();
    }
  }

  // ============================================
  // ENVIRONMENT MANAGEMENT
  // ============================================

  updateEnvironment(updates: Partial<EnvironmentState>): void {
    this.saveHistory();
    this.state.environment = {
      ...this.state.environment,
      ...updates,
    };
    this.state.updatedAt = Date.now();
  }

  addScent(scent: string): void {
    if (!this.state.environment.scents.includes(scent)) {
      this.saveHistory();
      this.state.environment.scents.push(scent);
      this.state.updatedAt = Date.now();
    }
  }

  removeScent(scent: string): void {
    const index = this.state.environment.scents.indexOf(scent);
    if (index > -1) {
      this.saveHistory();
      this.state.environment.scents.splice(index, 1);
      this.state.updatedAt = Date.now();
    }
  }

  // ============================================
  // NARRATIVE STATE MANAGEMENT
  // ============================================

  updateNarrative(updates: Partial<NarrativeState>): void {
    this.saveHistory();
    this.state.narrative = {
      ...this.state.narrative,
      ...updates,
    };
    this.state.updatedAt = Date.now();
  }

  setEscalationPhase(phase: EscalationPhase): void {
    this.saveHistory();
    this.state.narrative.escalationPhase = phase;
    this.state.updatedAt = Date.now();
  }

  adjustTension(delta: number): void {
    this.saveHistory();
    this.state.narrative.tension = Math.max(0, Math.min(10, 
      this.state.narrative.tension + delta
    ));
    this.state.updatedAt = Date.now();
  }

  setTension(value: number): void {
    this.saveHistory();
    this.state.narrative.tension = Math.max(0, Math.min(10, value));
    this.state.updatedAt = Date.now();
  }

  setPacing(pacing: 'slow' | 'moderate' | 'fast' | 'intense'): void {
    this.saveHistory();
    this.state.narrative.pacing = pacing;
    this.state.updatedAt = Date.now();
  }

  addRecentEvent(event: string): void {
    this.saveHistory();
    this.state.narrative.recentEvents.push(event);
    // Keep only last 10 events
    if (this.state.narrative.recentEvents.length > 10) {
      this.state.narrative.recentEvents.shift();
    }
    this.state.updatedAt = Date.now();
  }

  addForeshadowing(hint: string): void {
    this.saveHistory();
    this.state.narrative.foreshadowing.push(hint);
    this.state.updatedAt = Date.now();
  }

  // ============================================
  // FLAGS MANAGEMENT
  // ============================================

  setFlag(key: string, value: boolean | string | number): void {
    this.saveHistory();
    this.state.flags[key] = value;
    this.state.updatedAt = Date.now();
  }

  getFlag<T extends boolean | string | number>(key: string, defaultValue: T): T {
    return (this.state.flags[key] as T) ?? defaultValue;
  }

  clearFlag(key: string): void {
    this.saveHistory();
    delete this.state.flags[key];
    this.state.updatedAt = Date.now();
  }

  // ============================================
  // HISTORY & UNDO
  // ============================================

  private saveHistory(): void {
    this.stateHistory.push(JSON.parse(JSON.stringify(this.state)));
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  undo(): boolean {
    if (this.stateHistory.length === 0) return false;
    
    const previousState = this.stateHistory.pop();
    if (previousState) {
      this.state = previousState;
      return true;
    }
    return false;
  }

  // ============================================
  // BULK UPDATES (Post-Response)
  // ============================================

  /**
   * Apply multiple state updates at once (typically after model response)
   */
  applyBulkUpdate(updates: {
    location?: Partial<LocationState>;
    characters?: Array<{ id: string } & Partial<CharacterState>>;
    npcs?: Array<{ id: string } & Partial<NPCState>>;
    environment?: Partial<EnvironmentState>;
    narrative?: Partial<NarrativeState>;
    flags?: Record<string, boolean | string | number>;
    recentEvent?: string;
  }): void {
    this.saveHistory();

    if (updates.location) {
      this.state.location = { ...this.state.location, ...updates.location };
    }

    if (updates.characters) {
      updates.characters.forEach(charUpdate => {
        const existing = this.state.characters.find(c => c.id === charUpdate.id);
        if (existing) {
          Object.assign(existing, charUpdate);
          if (charUpdate.physicalState) {
            existing.physicalState = { ...existing.physicalState, ...charUpdate.physicalState };
          }
          if (charUpdate.emotionalState) {
            existing.emotionalState = { ...existing.emotionalState, ...charUpdate.emotionalState };
          }
        }
      });
    }

    if (updates.npcs) {
      updates.npcs.forEach(npcUpdate => {
        const existing = this.state.npcs.find(n => n.id === npcUpdate.id);
        if (existing) {
          Object.assign(existing, npcUpdate);
          if (npcUpdate.physicalState) {
            existing.physicalState = { ...existing.physicalState, ...npcUpdate.physicalState };
          }
          if (npcUpdate.emotionalState) {
            existing.emotionalState = { ...existing.emotionalState, ...npcUpdate.emotionalState };
          }
        }
      });
    }

    if (updates.environment) {
      this.state.environment = { ...this.state.environment, ...updates.environment };
    }

    if (updates.narrative) {
      this.state.narrative = { ...this.state.narrative, ...updates.narrative };
    }

    if (updates.flags) {
      this.state.flags = { ...this.state.flags, ...updates.flags };
    }

    if (updates.recentEvent) {
      this.state.narrative.recentEvents.push(updates.recentEvent);
      if (this.state.narrative.recentEvents.length > 10) {
        this.state.narrative.recentEvents.shift();
      }
    }

    this.state.updatedAt = Date.now();
  }

  // ============================================
  // SCENE LIFECYCLE
  // ============================================

  /**
   * Start a new scene, optionally preserving characters
   */
  newScene(options: {
    location?: Partial<LocationState>;
    preserveCharacters?: boolean;
    preserveNPCs?: boolean;
  } = {}): void {
    const preservedCharacters = options.preserveCharacters ? [...this.state.characters] : [];
    const preservedNPCs = options.preserveNPCs ? [...this.state.npcs] : [];

    this.state = this.createDefaultState({
      location: options.location ? { ...this.state.location, ...options.location } : undefined,
    });

    if (options.preserveCharacters) {
      // Reset physical/emotional states but keep characters
      this.state.characters = preservedCharacters.map(c => ({
        ...c,
        physicalState: createDefaultPhysicalState(),
        emotionalState: createDefaultEmotionalState(),
      }));
    }

    if (options.preserveNPCs) {
      this.state.npcs = preservedNPCs.map(n => ({
        ...n,
        physicalState: createDefaultPhysicalState(),
        emotionalState: createDefaultEmotionalState(),
        pendingActions: [],
      }));
    }

    this.stateHistory = [];
  }

  /**
   * Reset scene to initial state
   */
  reset(): void {
    this.state = this.createDefaultState();
    this.stateHistory = [];
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  exportState(): SceneState {
    return JSON.parse(JSON.stringify(this.state));
  }

  importState(state: SceneState): void {
    this.stateHistory = [];
    this.state = JSON.parse(JSON.stringify(state));
  }

  // ============================================
  // SUMMARIZATION (Token-efficient)
  // ============================================

  /**
   * Generate a compact summary of current scene state
   */
  getSummary(): string {
    const lines: string[] = [];

    lines.push(`Location: ${this.state.location.name}`);
    
    if (this.state.characters.length > 0) {
      const chars = this.state.characters.map(c => 
        `${c.name} (${c.emotionalState.primary})`
      ).join(', ');
      lines.push(`Characters: ${chars}`);
    }

    if (this.state.npcs.length > 0) {
      const npcs = this.state.npcs.map(n => n.name).join(', ');
      lines.push(`NPCs: ${npcs}`);
    }

    lines.push(`Atmosphere: ${this.state.environment.ambiance}`);
    lines.push(`Phase: ${this.state.narrative.escalationPhase} | Tension: ${this.state.narrative.tension}/10`);

    return lines.join(' | ');
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createSceneStateManager(
  initialState?: Partial<SceneState>
): SceneStateManager {
  return new SceneStateManager(initialState);
}

// ============================================
// STATE UPDATE PARSER (from response text)
// ============================================

/**
 * Attempt to parse state changes from model response
 * This is a heuristic approach - actual implementation may need tuning
 */
export function parseStateUpdatesFromResponse(response: string): Partial<{
  emotionalChanges: Array<{ name: string; emotion: string; intensity?: number }>;
  physicalChanges: Array<{ name: string; position?: string; effects?: string[] }>;
  environmentChanges: Partial<EnvironmentState>;
  tensionDelta: number;
}> {
  const updates: ReturnType<typeof parseStateUpdatesFromResponse> = {};

  // Emotional change patterns
  const emotionPatterns = [
    /(\w+)(?:'s)?\s+(?:face|expression|eyes)\s+(?:showed?|revealed?|betrayed?)\s+(\w+)/gi,
    /(\w+)\s+(?:felt|looked|seemed|appeared)\s+(\w+)/gi,
    /a\s+(?:wave|surge|flicker)\s+of\s+(\w+)\s+(?:crossed|passed|washed)/gi,
  ];

  const emotionalChanges: Array<{ name: string; emotion: string }> = [];
  emotionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      if (match[1] && match[2]) {
        emotionalChanges.push({ name: match[1], emotion: match[2].toLowerCase() });
      }
    }
  });

  if (emotionalChanges.length > 0) {
    updates.emotionalChanges = emotionalChanges;
  }

  // Tension indicators
  let tensionDelta = 0;
  const tensionIncreaseWords = ['tension', 'intense', 'heated', 'escalate', 'surge', 'spike'];
  const tensionDecreaseWords = ['calm', 'relax', 'ease', 'settle', 'subside'];
  
  const responseLower = response.toLowerCase();
  tensionIncreaseWords.forEach(word => {
    if (responseLower.includes(word)) tensionDelta += 0.5;
  });
  tensionDecreaseWords.forEach(word => {
    if (responseLower.includes(word)) tensionDelta -= 0.5;
  });

  if (tensionDelta !== 0) {
    updates.tensionDelta = Math.round(tensionDelta);
  }

  return updates;
}
