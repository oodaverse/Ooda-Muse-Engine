/**
 * Memory System Service
 * Handles short-term scene memory and long-term persistent memory
 */

import {
  ShortTermMemory,
  LongTermMemory,
  MemoryEvent,
  ConversationThread,
  UserProfileMemory,
  CharacterMemoryRecord,
  RelationshipMemory,
  FactMemory,
} from './types';

// ============================================
// DEFAULT MEMORY CONFIGURATIONS
// ============================================

const DEFAULT_SHORT_TERM_MAX_EVENTS = 50;
const DEFAULT_LONG_TERM_MAX_FACTS = 100;

export const createDefaultUserProfile = (): UserProfileMemory => ({
  pacingPreference: 'moderate',
  interactionStyle: [],
  patterns: [],
  preferences: {},
});

// ============================================
// SHORT-TERM MEMORY MANAGER
// ============================================

export class ShortTermMemoryManager {
  private memory: ShortTermMemory;

  constructor(sceneId: string, maxEvents: number = DEFAULT_SHORT_TERM_MAX_EVENTS) {
    this.memory = {
      sceneId,
      recentEvents: [],
      conversationThreads: [],
      tempStates: {},
      maxEvents,
    };
  }

  // ============================================
  // EVENT MANAGEMENT
  // ============================================

  addEvent(event: Omit<MemoryEvent, 'id' | 'timestamp'>): MemoryEvent {
    const fullEvent: MemoryEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.memory.recentEvents.push(fullEvent);

    // Trim if over limit
    if (this.memory.recentEvents.length > this.memory.maxEvents) {
      // Keep high-importance events longer
      const sorted = [...this.memory.recentEvents].sort((a, b) => {
        // Prioritize by importance, then recency
        if (a.importance !== b.importance) return b.importance - a.importance;
        return b.timestamp - a.timestamp;
      });
      this.memory.recentEvents = sorted.slice(0, this.memory.maxEvents);
    }

    return fullEvent;
  }

  getRecentEvents(count?: number): MemoryEvent[] {
    const events = [...this.memory.recentEvents].sort(
      (a, b) => b.timestamp - a.timestamp
    );
    return count ? events.slice(0, count) : events;
  }

  getEventsByType(type: MemoryEvent['eventType']): MemoryEvent[] {
    return this.memory.recentEvents.filter(e => e.eventType === type);
  }

  getEventsByParticipant(participant: string): MemoryEvent[] {
    return this.memory.recentEvents.filter(e => 
      e.participants.includes(participant)
    );
  }

  getHighImportanceEvents(minImportance: number = 7): MemoryEvent[] {
    return this.memory.recentEvents.filter(e => e.importance >= minImportance);
  }

  // ============================================
  // CONVERSATION THREADS
  // ============================================

  startThread(topic: string, participants: string[], turnNumber: number): ConversationThread {
    const thread: ConversationThread = {
      id: this.generateId(),
      topic,
      participants,
      startTurn: turnNumber,
      lastTurn: turnNumber,
      resolved: false,
      keyPoints: [],
    };

    this.memory.conversationThreads.push(thread);
    return thread;
  }

  updateThread(threadId: string, updates: Partial<ConversationThread>): void {
    const thread = this.memory.conversationThreads.find(t => t.id === threadId);
    if (thread) {
      Object.assign(thread, updates);
    }
  }

  addKeyPointToThread(threadId: string, keyPoint: string): void {
    const thread = this.memory.conversationThreads.find(t => t.id === threadId);
    if (thread) {
      thread.keyPoints.push(keyPoint);
    }
  }

  resolveThread(threadId: string): void {
    const thread = this.memory.conversationThreads.find(t => t.id === threadId);
    if (thread) {
      thread.resolved = true;
    }
  }

  getActiveThreads(): ConversationThread[] {
    return this.memory.conversationThreads.filter(t => !t.resolved);
  }

  getThreadByTopic(topicKeyword: string): ConversationThread | undefined {
    return this.memory.conversationThreads.find(t => 
      t.topic.toLowerCase().includes(topicKeyword.toLowerCase())
    );
  }

  // ============================================
  // TEMPORARY STATE
  // ============================================

  setTempState(key: string, value: any): void {
    this.memory.tempStates[key] = value;
  }

  getTempState<T>(key: string, defaultValue?: T): T | undefined {
    return this.memory.tempStates[key] as T ?? defaultValue;
  }

  clearTempState(key: string): void {
    delete this.memory.tempStates[key];
  }

  // ============================================
  // SCENE MANAGEMENT
  // ============================================

  getSceneId(): string {
    return this.memory.sceneId;
  }

  reset(newSceneId: string): void {
    this.memory = {
      sceneId: newSceneId,
      recentEvents: [],
      conversationThreads: [],
      tempStates: {},
      maxEvents: this.memory.maxEvents,
    };
  }

  // ============================================
  // SUMMARIZATION
  // ============================================

  /**
   * Generate a summary of recent events for prompt injection
   */
  getSummaryForPrompt(maxEvents: number = 5): string {
    const recent = this.getRecentEvents(maxEvents);
    if (recent.length === 0) return '';

    const lines = ['Recent scene events:'];
    recent.forEach(event => {
      lines.push(`- [${event.eventType}] ${event.summary}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate a compact memory summary
   */
  getCompactSummary(): string {
    const highImportance = this.getHighImportanceEvents();
    const activeThreads = this.getActiveThreads();

    const parts: string[] = [];

    if (highImportance.length > 0) {
      parts.push(`Key events: ${highImportance.map(e => e.summary).join('; ')}`);
    }

    if (activeThreads.length > 0) {
      parts.push(`Active topics: ${activeThreads.map(t => t.topic).join(', ')}`);
    }

    return parts.join(' | ');
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  export(): ShortTermMemory {
    return JSON.parse(JSON.stringify(this.memory));
  }

  import(memory: ShortTermMemory): void {
    this.memory = JSON.parse(JSON.stringify(memory));
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// LONG-TERM MEMORY MANAGER
// ============================================

export class LongTermMemoryManager {
  private memory: LongTermMemory;
  private maxFacts: number;
  private storageKey: string;

  constructor(
    storageKey: string = 'rp_long_term_memory',
    maxFacts: number = DEFAULT_LONG_TERM_MAX_FACTS
  ) {
    this.storageKey = storageKey;
    this.maxFacts = maxFacts;
    this.memory = this.loadFromStorage() || this.createDefaultMemory();
  }

  private createDefaultMemory(): LongTermMemory {
    return {
      userProfile: createDefaultUserProfile(),
      characterMemories: {},
      relationships: [],
      facts: [],
    };
  }

  // ============================================
  // STORAGE
  // ============================================

  private loadFromStorage(): LongTermMemory | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
    } catch (error) {
      console.error('Failed to save long-term memory:', error);
    }
  }

  // ============================================
  // USER PROFILE
  // ============================================

  getUserProfile(): UserProfileMemory {
    return { ...this.memory.userProfile };
  }

  updateUserProfile(updates: Partial<UserProfileMemory>): void {
    this.memory.userProfile = {
      ...this.memory.userProfile,
      ...updates,
    };
    this.save();
  }

  addInteractionStylePattern(pattern: string): void {
    if (!this.memory.userProfile.interactionStyle.includes(pattern)) {
      this.memory.userProfile.interactionStyle.push(pattern);
      // Keep only last 10 patterns
      if (this.memory.userProfile.interactionStyle.length > 10) {
        this.memory.userProfile.interactionStyle.shift();
      }
      this.save();
    }
  }

  addUserPattern(pattern: string): void {
    if (!this.memory.userProfile.patterns.includes(pattern)) {
      this.memory.userProfile.patterns.push(pattern);
      if (this.memory.userProfile.patterns.length > 10) {
        this.memory.userProfile.patterns.shift();
      }
      this.save();
    }
  }

  setUserPreference(key: string, value: boolean): void {
    this.memory.userProfile.preferences[key] = value;
    this.save();
  }

  // ============================================
  // CHARACTER MEMORIES
  // ============================================

  getCharacterMemory(characterId: string): CharacterMemoryRecord | undefined {
    return this.memory.characterMemories[characterId];
  }

  initializeCharacterMemory(characterId: string): CharacterMemoryRecord {
    if (!this.memory.characterMemories[characterId]) {
      this.memory.characterMemories[characterId] = {
        characterId,
        interactions: [],
        userRelationship: 'new acquaintance',
        disposition: 0,
        keyMoments: [],
      };
      this.save();
    }
    return this.memory.characterMemories[characterId];
  }

  addCharacterInteraction(characterId: string, event: MemoryEvent): void {
    this.initializeCharacterMemory(characterId);
    const record = this.memory.characterMemories[characterId];
    
    record.interactions.push(event);
    
    // Keep only last 50 interactions per character
    if (record.interactions.length > 50) {
      // Preserve high-importance interactions
      record.interactions = record.interactions
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 50)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    
    this.save();
  }

  addKeyMoment(characterId: string, moment: string): void {
    this.initializeCharacterMemory(characterId);
    const record = this.memory.characterMemories[characterId];
    
    if (!record.keyMoments.includes(moment)) {
      record.keyMoments.push(moment);
      if (record.keyMoments.length > 20) {
        record.keyMoments.shift();
      }
      this.save();
    }
  }

  updateCharacterDisposition(characterId: string, delta: number): void {
    this.initializeCharacterMemory(characterId);
    const record = this.memory.characterMemories[characterId];
    record.disposition = Math.max(-10, Math.min(10, record.disposition + delta));
    this.save();
  }

  updateCharacterRelationship(characterId: string, relationship: string): void {
    this.initializeCharacterMemory(characterId);
    this.memory.characterMemories[characterId].userRelationship = relationship;
    this.save();
  }

  // ============================================
  // RELATIONSHIPS
  // ============================================

  getRelationship(charA: string, charB: string): RelationshipMemory | undefined {
    return this.memory.relationships.find(r => 
      (r.characterA === charA && r.characterB === charB) ||
      (r.characterA === charB && r.characterB === charA)
    );
  }

  setRelationship(relationship: RelationshipMemory): void {
    const existing = this.getRelationship(relationship.characterA, relationship.characterB);
    if (existing) {
      Object.assign(existing, relationship);
    } else {
      this.memory.relationships.push(relationship);
    }
    this.save();
  }

  updateRelationshipHistory(charA: string, charB: string, event: string): void {
    let relationship = this.getRelationship(charA, charB);
    if (!relationship) {
      relationship = {
        characterA: charA,
        characterB: charB,
        relationshipType: 'acquaintance',
        status: 'neutral',
        history: [],
        tension: 0,
      };
      this.memory.relationships.push(relationship);
    }
    
    relationship.history.push(event);
    if (relationship.history.length > 20) {
      relationship.history.shift();
    }
    this.save();
  }

  // ============================================
  // FACTS
  // ============================================

  addFact(fact: Omit<FactMemory, 'id' | 'createdAt' | 'lastReferencedAt'>): FactMemory {
    const fullFact: FactMemory = {
      ...fact,
      id: this.generateId(),
      createdAt: Date.now(),
      lastReferencedAt: Date.now(),
    };

    this.memory.facts.push(fullFact);

    // Trim if over limit (remove low-confidence, old facts first)
    if (this.memory.facts.length > this.maxFacts) {
      this.memory.facts = this.memory.facts
        .sort((a, b) => {
          // Prioritize by confidence, then recency of reference
          if (Math.abs(a.confidence - b.confidence) > 0.2) {
            return b.confidence - a.confidence;
          }
          return b.lastReferencedAt - a.lastReferencedAt;
        })
        .slice(0, this.maxFacts);
    }

    this.save();
    return fullFact;
  }

  getFactsByCategory(category: FactMemory['category']): FactMemory[] {
    return this.memory.facts.filter(f => f.category === category);
  }

  searchFacts(query: string): FactMemory[] {
    const queryLower = query.toLowerCase();
    return this.memory.facts.filter(f => 
      f.content.toLowerCase().includes(queryLower) ||
      f.source.toLowerCase().includes(queryLower)
    );
  }

  referenceFact(factId: string): void {
    const fact = this.memory.facts.find(f => f.id === factId);
    if (fact) {
      fact.lastReferencedAt = Date.now();
      this.save();
    }
  }

  updateFactConfidence(factId: string, newConfidence: number): void {
    const fact = this.memory.facts.find(f => f.id === factId);
    if (fact) {
      fact.confidence = Math.max(0, Math.min(1, newConfidence));
      this.save();
    }
  }

  // ============================================
  // SUMMARIZATION FOR PROMPT
  // ============================================

  /**
   * Generate USER MODEL NOTES section for prompt
   */
  getUserModelNotesForPrompt(): string {
    const profile = this.memory.userProfile;
    const lines: string[] = [];

    if (profile.userName) {
      lines.push(`User: ${profile.userName}`);
    }

    lines.push(`Pacing preference: ${profile.pacingPreference}`);

    if (profile.interactionStyle.length > 0) {
      lines.push(`Interaction style: ${profile.interactionStyle.slice(-3).join(', ')}`);
    }

    if (profile.patterns.length > 0) {
      lines.push(`Notable patterns: ${profile.patterns.slice(-3).join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Get relevant character memory summary for prompt
   */
  getCharacterMemorySummary(characterId: string): string {
    const record = this.memory.characterMemories[characterId];
    if (!record) return '';

    const lines: string[] = [
      `Relationship with user: ${record.userRelationship}`,
      `Disposition: ${record.disposition}/10`,
    ];

    if (record.keyMoments.length > 0) {
      lines.push(`Key moments: ${record.keyMoments.slice(-3).join('; ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Get relevant facts for context
   */
  getRelevantFacts(contextKeywords: string[], maxFacts: number = 5): FactMemory[] {
    return this.memory.facts
      .filter(fact => 
        contextKeywords.some(keyword => 
          fact.content.toLowerCase().includes(keyword.toLowerCase())
        )
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxFacts);
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Clear all memory (use with caution)
   */
  clearAll(): void {
    this.memory = this.createDefaultMemory();
    this.save();
  }

  /**
   * Clear specific character memory
   */
  clearCharacterMemory(characterId: string): void {
    delete this.memory.characterMemories[characterId];
    this.save();
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  export(): LongTermMemory {
    return JSON.parse(JSON.stringify(this.memory));
  }

  import(memory: LongTermMemory): void {
    this.memory = JSON.parse(JSON.stringify(memory));
    this.save();
  }

  private generateId(): string {
    return `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// USER PATTERN ANALYZER
// ============================================

export class UserPatternAnalyzer {
  private messageHistory: string[] = [];
  private maxHistory: number = 100;

  addMessage(message: string): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }
  }

  /**
   * Analyze user patterns from message history
   */
  analyzePatterns(): {
    pacingPreference: 'slow' | 'moderate' | 'fast';
    interactionStyles: string[];
    commonThemes: string[];
  } {
    const avgLength = this.messageHistory.reduce((sum, m) => sum + m.length, 0) / 
      Math.max(1, this.messageHistory.length);

    // Pacing from message length
    let pacingPreference: 'slow' | 'moderate' | 'fast' = 'moderate';
    if (avgLength > 300) pacingPreference = 'slow';
    else if (avgLength < 100) pacingPreference = 'fast';

    // Interaction styles
    const interactionStyles: string[] = [];
    const allText = this.messageHistory.join(' ').toLowerCase();

    if (/\*[^*]+\*/.test(allText)) {
      interactionStyles.push('action-oriented');
    }
    if (/"[^"]+"|'[^']+'/.test(allText)) {
      interactionStyles.push('dialogue-heavy');
    }
    if (/describe|detail|show|reveal/.test(allText)) {
      interactionStyles.push('descriptive');
    }
    if (/feel|emotion|heart|soul/.test(allText)) {
      interactionStyles.push('emotionally-engaged');
    }

    // Common themes
    const themes: string[] = [];
    const themePatterns: Record<string, RegExp> = {
      'romance': /love|romantic|kiss|embrace|heart/i,
      'action': /fight|attack|defend|run|escape/i,
      'mystery': /secret|hidden|discover|reveal|mystery/i,
      'tension': /tense|nervous|afraid|worried|anxious/i,
    };

    Object.entries(themePatterns).forEach(([theme, pattern]) => {
      if (pattern.test(allText)) {
        themes.push(theme);
      }
    });

    return {
      pacingPreference,
      interactionStyles,
      commonThemes: themes,
    };
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createShortTermMemory(sceneId: string, maxEvents?: number): ShortTermMemoryManager {
  return new ShortTermMemoryManager(sceneId, maxEvents);
}

export function createLongTermMemory(storageKey?: string, maxFacts?: number): LongTermMemoryManager {
  return new LongTermMemoryManager(storageKey, maxFacts);
}

export function createUserPatternAnalyzer(): UserPatternAnalyzer {
  return new UserPatternAnalyzer();
}
