/**
 * Response Validator
 * Post-generation validation and optional regeneration for roleplay responses
 */

import {
  ValidationResult,
  ValidationIssue,
  ValidationIssueType,
  ValidationConfig,
  ValidationContext,
  ValidationRule,
  TrackedAction,
} from './types';

// ============================================
// DEFAULT VALIDATION CONFIG
// ============================================

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minimumScore: 70,
  maxRetries: 2,
  enabledChecks: [
    'asks_question',
    'ignores_action',
    'mirrors_phrasing',
    'breaks_character',
    'summarizes_instead',
    'wrong_perspective',
    'repetitive_content',
    'missing_consequences',
  ],
  customRules: [],
};

// ============================================
// VALIDATION PATTERNS
// ============================================

const QUESTION_PATTERNS = [
  /\?\s*$/m,                          // Ends with question mark
  /\bwhat do you\b/i,                 // What do you...
  /\bhow do you\b/i,                  // How do you...
  /\bwould you like\b/i,              // Would you like...
  /\bwhat would you\b/i,              // What would you...
  /\bdo you want\b/i,                 // Do you want...
  /\bshall (we|I)\b/i,                // Shall we/I...
  /\bwhat (will|should) you\b/i,      // What will/should you...
];

const CHARACTER_BREAK_PATTERNS = [
  /\bI('m| am) an AI\b/i,
  /\bas an AI\b/i,
  /\bI('m| am) (just )?a (language )?model\b/i,
  /\bI don't have (real )?(feelings|emotions)\b/i,
  /\bI can't actually\b/i,
  /\bI('m| am) not (really|actually) a\b/i,
  /\bmy programming\b/i,
  /\bI was (created|designed|programmed)\b/i,
];

const SUMMARIZATION_PATTERNS = [
  /\bIn summary\b/i,
  /\bTo summarize\b/i,
  /\bOverall,?\b/i,
  /\bIn conclusion\b/i,
  /\bTo sum up\b/i,
  /\bThe main (points?|takeaways?)\b/i,
  /\bThis (shows|demonstrates|illustrates) that\b/i,
];

const FIRST_PERSON_PATTERNS = [
  /^I\s/m,                            // Starts with "I "
  /\bI think\b/i,
  /\bI believe\b/i,
  /\bI feel\b/i,
  /\bIn my opinion\b/i,
];

// ============================================
// RESPONSE VALIDATOR CLASS
// ============================================

export class ResponseValidator {
  private config: ValidationConfig;
  private customRules: ValidationRule[] = [];

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
    this.customRules = config.customRules || [];
  }

  // ============================================
  // MAIN VALIDATION METHOD
  // ============================================

  validate(response: string, context: ValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Run all enabled checks
    if (this.config.enabledChecks.includes('asks_question')) {
      const issue = this.checkAsksQuestion(response);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('ignores_action')) {
      const actionIssues = this.checkIgnoresActions(response, context.pendingActions);
      issues.push(...actionIssues);
    }

    if (this.config.enabledChecks.includes('mirrors_phrasing')) {
      const issue = this.checkMirrorsPhrasing(response, context.userMessage);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('breaks_character')) {
      const issue = this.checkBreaksCharacter(response);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('summarizes_instead')) {
      const issue = this.checkSummarizesInstead(response);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('wrong_perspective')) {
      const issue = this.checkWrongPerspective(response);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('repetitive_content')) {
      const issue = this.checkRepetitiveContent(response, context.previousResponses);
      if (issue) issues.push(issue);
    }

    if (this.config.enabledChecks.includes('missing_consequences')) {
      const issue = this.checkMissingConsequences(response, context);
      if (issue) issues.push(issue);
    }

    // Run custom rules
    for (const rule of this.customRules) {
      const issue = rule.check(response, context);
      if (issue) issues.push(issue);
    }

    // Calculate score
    const score = this.calculateScore(issues);
    const requiresRegeneration = 
      score < this.config.minimumScore ||
      issues.some(i => i.severity === 'critical');

    return {
      valid: !requiresRegeneration,
      issues,
      score,
      requiresRegeneration,
    };
  }

  // ============================================
  // INDIVIDUAL CHECKS
  // ============================================

  private checkAsksQuestion(response: string): ValidationIssue | null {
    // Check if response ends with a direct question to the user
    for (const pattern of QUESTION_PATTERNS) {
      if (pattern.test(response)) {
        // Allow rhetorical questions or NPC questions in dialogue
        const isDialogue = this.isWithinDialogue(response, pattern);
        if (!isDialogue) {
          return {
            type: 'asks_question',
            severity: 'error',
            description: 'Response ends with a question to the user',
            suggestion: 'Remove interrogative ending or rephrase as narrative motion',
          };
        }
      }
    }
    return null;
  }

  private isWithinDialogue(text: string, pattern: RegExp): boolean {
    // Check if the pattern match is within quotation marks
    const match = text.match(pattern);
    if (!match) return false;
    
    const index = text.search(pattern);
    const beforeMatch = text.substring(0, index);
    const quoteCount = (beforeMatch.match(/"/g) || []).length;
    
    // If odd number of quotes before, we're inside dialogue
    return quoteCount % 2 === 1;
  }

  private checkIgnoresActions(
    response: string, 
    pendingActions: TrackedAction[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const responseLower = response.toLowerCase();

    for (const action of pendingActions) {
      const actionWords = action.rawText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const hasAnyKeyword = actionWords.some(word => responseLower.includes(word));
      
      // Check for consequence/reaction words
      const hasReaction = /\b(react|respond|feel|notice|sense|saw|heard|felt)\b/i.test(response);
      
      if (!hasAnyKeyword && !hasReaction && response.length < 500) {
        issues.push({
          type: 'ignores_action',
          severity: 'error',
          description: `Action may be ignored: "${action.rawText.substring(0, 50)}..."`,
          location: `Action ID: ${action.id}`,
          suggestion: 'Ensure the response addresses or transforms this user action',
        });
      }
    }

    return issues;
  }

  private checkMirrorsPhrasing(response: string, userMessage: string): ValidationIssue | null {
    const responseLower = response.toLowerCase();
    const userLower = userMessage.toLowerCase();
    
    // Extract significant phrases from user message (4+ word sequences)
    const userPhrases = this.extractPhrases(userLower, 4);
    
    for (const phrase of userPhrases) {
      if (responseLower.includes(phrase)) {
        // Check if it's in dialogue (which is more acceptable)
        if (!this.isWithinDialogue(response, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))) {
          return {
            type: 'mirrors_phrasing',
            severity: 'warning',
            description: `Response mirrors user phrasing: "${phrase}"`,
            suggestion: 'Transform the action into reactions and consequences, not restatement',
          };
        }
      }
    }
    
    return null;
  }

  private extractPhrases(text: string, minWords: number): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];
    
    for (let i = 0; i <= words.length - minWords; i++) {
      const phrase = words.slice(i, i + minWords).join(' ');
      if (phrase.length > 15) { // At least 15 chars
        phrases.push(phrase);
      }
    }
    
    return phrases;
  }

  private checkBreaksCharacter(response: string): ValidationIssue | null {
    for (const pattern of CHARACTER_BREAK_PATTERNS) {
      if (pattern.test(response)) {
        return {
          type: 'breaks_character',
          severity: 'critical',
          description: 'Response breaks character immersion',
          suggestion: 'Remove AI self-references and stay in character',
        };
      }
    }
    return null;
  }

  private checkSummarizesInstead(response: string): ValidationIssue | null {
    for (const pattern of SUMMARIZATION_PATTERNS) {
      if (pattern.test(response)) {
        return {
          type: 'summarizes_instead',
          severity: 'warning',
          description: 'Response contains summarization language',
          suggestion: 'Dramatize with action and dialogue instead of summarizing',
        };
      }
    }
    return null;
  }

  private checkWrongPerspective(response: string): ValidationIssue | null {
    // Check for first-person perspective (should be third-person limited)
    const lines = response.split('\n');
    
    for (const line of lines) {
      // Skip dialogue (within quotes)
      if (/^"/.test(line.trim()) || /^'/.test(line.trim())) continue;
      
      for (const pattern of FIRST_PERSON_PATTERNS) {
        if (pattern.test(line) && !this.isWithinDialogue(line, pattern)) {
          return {
            type: 'wrong_perspective',
            severity: 'warning',
            description: 'Response may use first-person perspective outside dialogue',
            location: line.substring(0, 50),
            suggestion: 'Use third-person limited perspective in narration',
          };
        }
      }
    }
    
    return null;
  }

  private checkRepetitiveContent(
    response: string, 
    previousResponses: string[]
  ): ValidationIssue | null {
    if (previousResponses.length === 0) return null;

    const currentPhrases = this.extractPhrases(response.toLowerCase(), 5);
    const recentResponse = previousResponses[previousResponses.length - 1]?.toLowerCase() || '';
    
    let repetitionCount = 0;
    for (const phrase of currentPhrases) {
      if (recentResponse.includes(phrase)) {
        repetitionCount++;
      }
    }

    // If more than 20% of phrases are repeated, flag it
    if (currentPhrases.length > 0 && repetitionCount / currentPhrases.length > 0.2) {
      return {
        type: 'repetitive_content',
        severity: 'warning',
        description: 'Response contains significant repetition from previous response',
        suggestion: 'Vary vocabulary and phrasing for narrative freshness',
      };
    }

    return null;
  }

  private checkMissingConsequences(
    response: string, 
    context: ValidationContext
  ): ValidationIssue | null {
    // If there are pending physical or intimate actions, check for consequence words
    const physicalActions = context.pendingActions.filter(a => 
      a.actionType === 'physical' || a.actionType === 'intimate'
    );

    if (physicalActions.length === 0) return null;

    const consequencePatterns = [
      /\b(result|consequence|effect|impact|reaction)\b/i,
      /\b(felt|sensed|experienced|noticed)\b/i,
      /\b(body|skin|touch|sensation|warmth)\b/i,
      /\b(shiver|tremble|gasp|moan|sigh)\b/i,
    ];

    const hasConsequences = consequencePatterns.some(p => p.test(response));

    if (!hasConsequences && response.length < 400) {
      return {
        type: 'missing_consequences',
        severity: 'warning',
        description: 'Physical action may lack sensory consequences',
        suggestion: 'Add physical/emotional reactions and lingering effects',
      };
    }

    return null;
  }

  // ============================================
  // SCORING
  // ============================================

  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;
    
    const penalties: Record<ValidationIssue['severity'], number> = {
      'warning': 10,
      'error': 25,
      'critical': 50,
    };

    for (const issue of issues) {
      score -= penalties[issue.severity];
    }

    return Math.max(0, score);
  }

  // ============================================
  // CUSTOM RULES
  // ============================================

  addCustomRule(rule: ValidationRule): void {
    this.customRules.push(rule);
  }

  removeCustomRule(name: string): void {
    this.customRules = this.customRules.filter(r => r.name !== name);
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  updateConfig(updates: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.customRules) {
      this.customRules = updates.customRules;
    }
  }

  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  enableCheck(check: ValidationIssueType): void {
    if (!this.config.enabledChecks.includes(check)) {
      this.config.enabledChecks.push(check);
    }
  }

  disableCheck(check: ValidationIssueType): void {
    this.config.enabledChecks = this.config.enabledChecks.filter(c => c !== check);
  }
}

// ============================================
// REGENERATION GUIDANCE
// ============================================

export interface RegenerationGuidance {
  instructions: string;
  focusAreas: string[];
  avoidPatterns: string[];
}

/**
 * Generate guidance for response regeneration based on validation issues
 */
export function generateRegenerationGuidance(
  issues: ValidationIssue[]
): RegenerationGuidance {
  const focusAreas: string[] = [];
  const avoidPatterns: string[] = [];
  const instructions: string[] = ['REGENERATION REQUIRED. Address these issues:'];

  for (const issue of issues) {
    instructions.push(`- ${issue.description}`);
    
    switch (issue.type) {
      case 'asks_question':
        focusAreas.push('End with forward narrative motion, not questions');
        avoidPatterns.push('interrogative endings');
        break;
      case 'ignores_action':
        focusAreas.push('Address all user actions with consequences');
        avoidPatterns.push('skipping or glossing over user input');
        break;
      case 'mirrors_phrasing':
        focusAreas.push('Transform actions into reactions, not restatements');
        avoidPatterns.push('copying user phrasing verbatim');
        break;
      case 'breaks_character':
        focusAreas.push('Stay fully in character');
        avoidPatterns.push('AI self-references');
        break;
      case 'summarizes_instead':
        focusAreas.push('Dramatize with action and dialogue');
        avoidPatterns.push('summary language');
        break;
      case 'wrong_perspective':
        focusAreas.push('Use third-person limited perspective');
        avoidPatterns.push('first-person narration outside dialogue');
        break;
      case 'repetitive_content':
        focusAreas.push('Vary vocabulary and phrasing');
        avoidPatterns.push('repeated phrases from previous response');
        break;
      case 'missing_consequences':
        focusAreas.push('Add physical and emotional consequences');
        avoidPatterns.push('action without reaction');
        break;
    }
  }

  return {
    instructions: instructions.join('\n'),
    focusAreas: [...new Set(focusAreas)],
    avoidPatterns: [...new Set(avoidPatterns)],
  };
}

/**
 * Build a regeneration prompt injection based on guidance
 */
export function buildRegenerationPrompt(guidance: RegenerationGuidance): string {
  const lines = [
    '=== REGENERATION GUIDANCE ===',
    guidance.instructions,
    '',
    'FOCUS ON:',
    ...guidance.focusAreas.map(f => `• ${f}`),
    '',
    'AVOID:',
    ...guidance.avoidPatterns.map(p => `• ${p}`),
  ];

  return lines.join('\n');
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createResponseValidator(
  config?: Partial<ValidationConfig>
): ResponseValidator {
  return new ResponseValidator({
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  });
}

// ============================================
// COMMON CUSTOM RULES
// ============================================

export const CUSTOM_RULES = {
  /**
   * Rule to check for minimum response length
   */
  minimumLength: (minLength: number): ValidationRule => ({
    name: 'minimum_length',
    description: `Response must be at least ${minLength} characters`,
    check: (response: string) => {
      if (response.length < minLength) {
        return {
          type: 'premature_resolution' as ValidationIssueType,
          severity: 'warning',
          description: `Response too short (${response.length}/${minLength} chars)`,
          suggestion: 'Expand with more detail and narrative depth',
        };
      }
      return null;
    },
  }),

  /**
   * Rule to ensure dialogue exists in response
   */
  requireDialogue: (): ValidationRule => ({
    name: 'require_dialogue',
    description: 'Response should contain character dialogue',
    check: (response: string) => {
      if (!/"[^"]+"/.test(response)) {
        return {
          type: 'summarizes_instead' as ValidationIssueType,
          severity: 'warning',
          description: 'Response lacks dialogue',
          suggestion: 'Include character speech for immersion',
        };
      }
      return null;
    },
  }),

  /**
   * Rule to check for banned words/phrases
   */
  bannedPhrases: (phrases: string[]): ValidationRule => ({
    name: 'banned_phrases',
    description: 'Response should not contain banned phrases',
    check: (response: string) => {
      const responseLower = response.toLowerCase();
      for (const phrase of phrases) {
        if (responseLower.includes(phrase.toLowerCase())) {
          return {
            type: 'breaks_character' as ValidationIssueType,
            severity: 'error',
            description: `Response contains banned phrase: "${phrase}"`,
            suggestion: 'Remove or rephrase the flagged content',
          };
        }
      }
      return null;
    },
  }),
};
