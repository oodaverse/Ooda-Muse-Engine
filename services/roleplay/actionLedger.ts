/**
 * Action Ledger Service
 * Parses user messages for discrete actions, tracks them, and ensures resolution
 */

import { TrackedAction, ActionType, ActionLedgerState } from './types';

// ============================================
// ACTION PATTERNS FOR PARSING
// ============================================

const ACTION_PATTERNS: { pattern: RegExp; type: ActionType }[] = [
  // Physical actions (movement, combat, touch)
  { pattern: /\b(walk|run|move|step|jump|leap|crawl|climb|fall|push|pull|grab|hold|release|throw|catch|hit|strike|punch|kick|block|dodge|roll|crouch|stand|sit|lie|kneel|reach|stretch|lean|bend|turn|spin|twist|squeeze|lift|lower|drop|pick up)\b/gi, type: 'physical' },
  
  // Verbal actions (dialogue, commands)
  { pattern: /\b(say|speak|tell|ask|whisper|shout|yell|scream|mutter|murmur|growl|hiss|sigh|moan|groan|laugh|cry|sob|gasp|demand|order|command|call|reply|respond|answer|admit|confess|deny|explain|describe|narrate)\b/gi, type: 'verbal' },
  
  // Emotional expressions
  { pattern: /\b(smile|frown|grin|smirk|blush|pale|tremble|shake|shiver|shudder|tense|relax|flinch|wince|cringe|glare|stare|gaze|glance|look away|avert)\b/gi, type: 'emotional' },
  
  // Observational actions
  { pattern: /\b(look|see|watch|observe|notice|spot|examine|inspect|study|scan|search|find|discover|recognize|realize)\b/gi, type: 'observational' },
  
  // Environmental interactions
  { pattern: /\b(open|close|shut|lock|unlock|break|smash|destroy|build|create|light|extinguish|burn|freeze|melt|pour|spill|clean|dirty|arrange|scatter)\b/gi, type: 'environmental' },
  
  // Intimate actions
  { pattern: /\b(kiss|embrace|hug|caress|stroke|touch|fondle|press|rub|massage|nuzzle|nibble|lick|bite|suck|taste|feel|explore|undress|remove|slip off|pull down)\b/gi, type: 'intimate' },
  
  // Meta/scene direction (in asterisks or brackets)
  { pattern: /\*[^*]+\*|\[[^\]]+\]|\([^)]+\)/g, type: 'meta' },
];

// ============================================
// ACTION LEDGER CLASS
// ============================================

export class ActionLedger {
  private state: ActionLedgerState;
  private maxPendingActions: number;

  constructor(maxPendingActions: number = 20) {
    this.maxPendingActions = maxPendingActions;
    this.state = {
      actions: [],
      currentTurn: 0,
      pendingCount: 0,
    };
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  getState(): ActionLedgerState {
    return { ...this.state };
  }

  getCurrentTurn(): number {
    return this.state.currentTurn;
  }

  advanceTurn(): void {
    this.state.currentTurn++;
  }

  // ============================================
  // ACTION PARSING
  // ============================================

  /**
   * Parse a user message for discrete actions
   */
  parseUserMessage(message: string): TrackedAction[] {
    const parsedActions: TrackedAction[] = [];
    const seenActions = new Set<string>();

    // Split message into sentences for better parsing
    const sentences = this.splitIntoSentences(message);

    sentences.forEach(sentence => {
      // Check for meta/scene direction first (asterisks, brackets)
      const metaMatches = sentence.match(/\*([^*]+)\*|\[([^\]]+)\]|\(([^)]+)\)/g);
      if (metaMatches) {
        metaMatches.forEach(match => {
          const content = match.replace(/[\*\[\]\(\)]/g, '').trim();
          if (content && !seenActions.has(content.toLowerCase())) {
            seenActions.add(content.toLowerCase());
            parsedActions.push(this.createAction(content, 'meta', sentence));
          }
        });
      }

      // Parse for action verbs
      ACTION_PATTERNS.forEach(({ pattern, type }) => {
        if (type === 'meta') return; // Already handled above
        
        const matches = sentence.match(pattern);
        if (matches) {
          // Extract the action context (surrounding words)
          matches.forEach(match => {
            const actionContext = this.extractActionContext(sentence, match);
            const key = `${type}:${actionContext.toLowerCase()}`;
            
            if (!seenActions.has(key)) {
              seenActions.add(key);
              parsedActions.push(this.createAction(actionContext, type, sentence));
            }
          });
        }
      });

      // Check for compound actions (multiple verbs in one sentence)
      const compoundPattern = /\b(and then|then|before|after|while|as)\b/gi;
      if (compoundPattern.test(sentence) && parsedActions.length === 0) {
        // Treat the whole sentence as a complex action
        parsedActions.push(this.createAction(sentence, 'other', sentence));
      }
    });

    // If no actions found but message exists, treat as general action
    if (parsedActions.length === 0 && message.trim().length > 0) {
      // Check if it's dialogue (starts with quotes)
      if (/^["']/.test(message.trim())) {
        parsedActions.push(this.createAction(message.trim(), 'verbal', message));
      } else {
        parsedActions.push(this.createAction(message.trim(), 'other', message));
      }
    }

    return parsedActions;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving quoted text
    const sentences: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      }

      current += char;

      if (!inQuotes && (char === '.' || char === '!' || char === '?')) {
        sentences.push(current.trim());
        current = '';
      }
    }

    if (current.trim()) {
      sentences.push(current.trim());
    }

    return sentences.filter(s => s.length > 0);
  }

  private extractActionContext(sentence: string, verb: string): string {
    // Get words around the verb for context
    const words = sentence.split(/\s+/);
    const verbIndex = words.findIndex(w => 
      w.toLowerCase().includes(verb.toLowerCase())
    );
    
    if (verbIndex === -1) return verb;

    const start = Math.max(0, verbIndex - 2);
    const end = Math.min(words.length, verbIndex + 4);
    
    return words.slice(start, end).join(' ').replace(/[.,!?]+$/, '');
  }

  private createAction(rawText: string, type: ActionType, fullSentence: string): TrackedAction {
    return {
      id: this.generateId(),
      rawText: rawText,
      actionType: type,
      subject: this.inferSubject(fullSentence),
      target: this.inferTarget(fullSentence),
      timestamp: Date.now(),
      turnCreated: this.state.currentTurn,
      resolved: false,
    };
  }

  private inferSubject(sentence: string): string {
    // Simple subject inference - look for pronouns or names at start
    const firstWord = sentence.split(/\s+/)[0]?.toLowerCase();
    
    if (['i', 'he', 'she', 'they', 'we', 'you'].includes(firstWord)) {
      return firstWord === 'i' ? 'user' : firstWord;
    }
    
    // Check for proper nouns (capitalized words)
    const properNoun = sentence.match(/^([A-Z][a-z]+)/);
    if (properNoun) {
      return properNoun[1];
    }
    
    return 'user'; // Default to user as subject
  }

  private inferTarget(sentence: string): string | undefined {
    // Look for "to/at/toward [target]" patterns
    const targetPatterns = [
      /(?:to|at|toward|towards|into|onto|against)\s+(?:the\s+)?([a-zA-Z]+)/i,
      /(?:his|her|their|your)\s+([a-zA-Z]+)/i,
    ];

    for (const pattern of targetPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // ACTION TRACKING
  // ============================================

  /**
   * Add parsed actions to the ledger
   */
  trackActions(actions: TrackedAction[]): void {
    actions.forEach(action => {
      this.state.actions.push(action);
      this.state.pendingCount++;
    });

    // Trim oldest resolved actions if over limit
    this.trimOldActions();
  }

  /**
   * Get all unresolved (pending) actions
   */
  getPendingActions(): TrackedAction[] {
    return this.state.actions.filter(a => !a.resolved);
  }

  /**
   * Get pending actions formatted for prompt injection
   */
  getPendingActionsForPrompt(): string {
    const pending = this.getPendingActions();
    if (pending.length === 0) return '';

    const lines = ['UNRESOLVED USER ACTIONS (must all be addressed):'];
    pending.forEach((action, idx) => {
      lines.push(`${idx + 1}. [${action.actionType.toUpperCase()}] ${action.rawText}`);
      if (action.target) {
        lines.push(`   Target: ${action.target}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Check if specific actions were addressed in a response
   */
  checkActionsInResponse(response: string, actions: TrackedAction[]): Map<string, boolean> {
    const results = new Map<string, boolean>();
    
    actions.forEach(action => {
      // Check if the response addresses the action
      const addressed = this.wasActionAddressed(response, action);
      results.set(action.id, addressed);
    });

    return results;
  }

  private wasActionAddressed(response: string, action: TrackedAction): boolean {
    const responseLower = response.toLowerCase();
    const actionLower = action.rawText.toLowerCase();
    
    // Direct keyword presence (weak check)
    const actionWords = actionLower.split(/\s+/).filter(w => w.length > 3);
    const keywordPresent = actionWords.some(word => responseLower.includes(word));
    
    // Check for consequence words that suggest transformation
    const consequencePatterns = [
      /\b(result|consequence|effect|react|respond|feel|sense|notice)\b/i,
      /\b(because|due to|from|caused|led to|made)\b/i,
    ];
    const hasConsequence = consequencePatterns.some(p => p.test(response));
    
    // Check for action type specific indicators
    const typeIndicators = this.getTypeIndicators(action.actionType);
    const hasTypeIndicator = typeIndicators.some(indicator => 
      responseLower.includes(indicator.toLowerCase())
    );

    // Action is considered addressed if:
    // - Keywords are present AND (has consequence OR has type indicator)
    // - OR the response is substantially long (500+ chars) suggesting narrative progression
    return (keywordPresent && (hasConsequence || hasTypeIndicator)) || response.length > 500;
  }

  private getTypeIndicators(type: ActionType): string[] {
    const indicators: Record<ActionType, string[]> = {
      physical: ['movement', 'motion', 'body', 'force', 'impact', 'contact', 'position'],
      verbal: ['said', 'spoke', 'voice', 'word', 'tone', 'reply', 'response'],
      emotional: ['felt', 'emotion', 'expression', 'face', 'eyes', 'heart', 'feeling'],
      observational: ['saw', 'noticed', 'observed', 'appeared', 'seemed', 'looked'],
      environmental: ['room', 'space', 'area', 'atmosphere', 'surroundings', 'environment'],
      intimate: ['touch', 'skin', 'body', 'sensation', 'warmth', 'closeness'],
      meta: ['scene', 'moment', 'time', 'then', 'suddenly', 'meanwhile'],
      other: [],
    };
    return indicators[type] || [];
  }

  // ============================================
  // RESOLUTION
  // ============================================

  /**
   * Mark actions as resolved
   */
  resolveActions(actionIds: string[], resolutionNote?: string): void {
    const currentTurn = this.state.currentTurn;
    
    actionIds.forEach(id => {
      const action = this.state.actions.find(a => a.id === id);
      if (action && !action.resolved) {
        action.resolved = true;
        action.turnResolved = currentTurn;
        action.resolutionNote = resolutionNote;
        this.state.pendingCount--;
      }
    });
  }

  /**
   * Auto-resolve actions based on response analysis
   */
  autoResolveFromResponse(response: string): string[] {
    const pending = this.getPendingActions();
    const resolutionResults = this.checkActionsInResponse(response, pending);
    const resolvedIds: string[] = [];

    resolutionResults.forEach((addressed, actionId) => {
      if (addressed) {
        resolvedIds.push(actionId);
      }
    });

    if (resolvedIds.length > 0) {
      this.resolveActions(resolvedIds, 'Auto-resolved from response analysis');
    }

    return resolvedIds;
  }

  /**
   * Force resolve all pending actions (use sparingly)
   */
  forceResolveAll(reason: string): void {
    const pending = this.getPendingActions();
    this.resolveActions(pending.map(a => a.id), `Force resolved: ${reason}`);
  }

  // ============================================
  // MAINTENANCE
  // ============================================

  private trimOldActions(): void {
    // Keep last N turns of actions, but always keep unresolved ones
    const keepTurns = 5;
    const cutoffTurn = this.state.currentTurn - keepTurns;
    
    this.state.actions = this.state.actions.filter(action => 
      !action.resolved || action.turnCreated >= cutoffTurn
    );

    // Also enforce max pending limit
    const pending = this.getPendingActions();
    if (pending.length > this.maxPendingActions) {
      // Resolve oldest pending actions
      const toResolve = pending
        .slice(0, pending.length - this.maxPendingActions)
        .map(a => a.id);
      this.resolveActions(toResolve, 'Auto-resolved due to limit');
    }
  }

  /**
   * Clear all actions (use for scene reset)
   */
  clear(): void {
    this.state = {
      actions: [],
      currentTurn: 0,
      pendingCount: 0,
    };
  }

  /**
   * Export state for persistence
   */
  exportState(): ActionLedgerState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Import state from persistence
   */
  importState(state: ActionLedgerState): void {
    this.state = JSON.parse(JSON.stringify(state));
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get action statistics for debugging/monitoring
   */
  getStatistics(): {
    totalActions: number;
    pendingActions: number;
    resolvedActions: number;
    actionsByType: Record<ActionType, number>;
    averageResolutionTime: number;
  } {
    const byType: Record<ActionType, number> = {
      physical: 0, verbal: 0, emotional: 0, observational: 0,
      environmental: 0, intimate: 0, meta: 0, other: 0,
    };

    let totalResolutionTurns = 0;
    let resolvedCount = 0;

    this.state.actions.forEach(action => {
      byType[action.actionType]++;
      if (action.resolved && action.turnResolved !== undefined) {
        totalResolutionTurns += (action.turnResolved - action.turnCreated);
        resolvedCount++;
      }
    });

    return {
      totalActions: this.state.actions.length,
      pendingActions: this.state.pendingCount,
      resolvedActions: this.state.actions.filter(a => a.resolved).length,
      actionsByType: byType,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTurns / resolvedCount : 0,
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createActionLedger(maxPending: number = 20): ActionLedger {
  return new ActionLedger(maxPending);
}
