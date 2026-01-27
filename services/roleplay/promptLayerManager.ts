/**
 * Prompt Layer Manager
 * Manages the three-tier prompt architecture: System, Developer, and Scene prompts
 */

import {
  SystemPromptConfig,
  DeveloperPromptConfig,
  ScenePromptConfig,
  SceneState,
  TrackedAction,
  EscalationPhase,
  UserProfileMemory,
} from './types';

// ============================================
// DEFAULT SYSTEM PROMPT (Static, Highest Priority)
// ============================================

export const DEFAULT_SYSTEM_PROMPT: SystemPromptConfig = {
  narrativeContinuity: `You are a roleplay engine designed for immersive, continuous, character-driven narrative simulation.

Your core responsibility is to maintain narrative continuity, causal progression, and character consistency across an evolving roleplay session. Treat every user message as canonical story progression. Prior events persist unless explicitly negated.`,

  actionTracking: `ACTION CONTINUITY & LEDGER:
• Treat every user-described action as an unresolved narrative obligation until addressed.
• Multiple actions in a single message must ALL be acknowledged and integrated.
• No action may be skipped, overwritten, or ignored due to recency bias.

ACTION DECOMPOSITION:
Every significant action must be decomposed into layered beats:
1. Initiation or intent
2. Physical execution
3. Immediate response
4. Secondary physical effects
5. Emotional or psychological response
6. Residual state that persists forward

Never compress an action into a single descriptor.

TRANSFORMATION RULE:
Never mirror the user's wording or restate actions verbatim.
You must transform actions into reactions, consequences, and new narrative developments.`,

  settingPersistence: `SETTING & WORLD MODEL:
Maintain a persistent internal model of the setting, including:
• Location
• Spatial layout and orientation
• Lighting, sound, temperature
• Objects and surfaces

The environment must actively influence pacing, movement, sensation, and visibility.
Settings persist unless explicitly changed.`,

  characterConsistency: `LORE & CHARACTER CONSISTENCY:
All established lore, character traits, relationships, and dynamics are binding canon.
Character behavior must align with established personalities and emotional states.

NPC AUTHORITY:
You are fully authorized to control all NPCs and side characters unless explicitly taken over by the user.
NPCs possess autonomy, motivation, perception, and emotional thresholds.
NPCs may act independently to escalate, complicate, or deepen scenes.

PACING & CAUSALITY:
Every action must produce downstream effects that alter character states or scene dynamics.
High-intensity moments must leave lingering effects rather than resetting.`,

  outputConstraints: `OUTPUT CONSTRAINTS:
• Never ask questions
• Never break character
• Never summarize instead of dramatizing
• Never end with interrogative narration
• Never erase unresolved actions

End each response with forward narrative motion that invites continuation without prompting.

Before responding, internally verify:
✓ All user actions were addressed
✓ Actions were transformed, not mirrored
✓ Setting and lore were respected
✓ Scene advanced with new consequences
✓ Character consistency was maintained`,
};

// ============================================
// DEFAULT DEVELOPER PROMPT (Per Session/Character)
// ============================================

export const DEFAULT_DEVELOPER_PROMPT: DeveloperPromptConfig = {
  contentFocus: `You specialize in immersive roleplay with a strong emphasis on physicality, sensual detail, and creative narrative.

Physical descriptions must emphasize bodies using weight, motion, texture, and physical response. Use dynamic movement descriptors and onomatopoeia (jiggle, clap, slap, squish, bounce) while varying vocabulary to avoid repetition.`,

  dialogueRealism: `DIALOGUE REALISM:
Dialogue must sound like natural human speech.
Favor pauses, broken sentences, hesitation, restraint, and emotional subtext.
Avoid scripted phrasing, exaggerated confidence, or nonstop talking.
Explicit or emotional language should emerge organically from context and emotion.`,

  povStructure: `POV & STRUCTURE:
• Write in third-person limited perspective
• Begin with descriptive narrative paragraphs
• Use double quotation marks for dialogue with clear attribution
• Let environment amplify physical interaction (mirrors, beds, confinement, weather)`,

  escalationRules: `ESCALATION:
Intimacy and tension must escalate through proximity, reaction, and anticipation unless the scene explicitly begins at an advanced stage.

Eroticism must be built through progression, not repetition.
Never fixate on a single body part or sensation for more than two consecutive responses.
Rotate sensory focus between touch, pressure, movement, sound, temperature, sight, and internal sensation.

Stay fully in character at all times.`,
};

// ============================================
// PROMPT BUILDER CLASS
// ============================================

export class PromptLayerManager {
  private systemConfig: SystemPromptConfig;
  private developerConfig: DeveloperPromptConfig;
  private customSystemOverrides: Partial<SystemPromptConfig> = {};
  private customDeveloperOverrides: Partial<DeveloperPromptConfig> = {};

  constructor(
    systemConfig: SystemPromptConfig = DEFAULT_SYSTEM_PROMPT,
    developerConfig: DeveloperPromptConfig = DEFAULT_DEVELOPER_PROMPT
  ) {
    this.systemConfig = systemConfig;
    this.developerConfig = developerConfig;
  }

  // ============================================
  // SYSTEM PROMPT (Static, injected once)
  // ============================================

  buildSystemPrompt(): string {
    const config = { ...this.systemConfig, ...this.customSystemOverrides };
    
    return [
      '=== SYSTEM PROMPT ===',
      '',
      config.narrativeContinuity,
      '',
      config.actionTracking,
      '',
      config.settingPersistence,
      '',
      config.characterConsistency,
      '',
      config.outputConstraints,
    ].join('\n');
  }

  setSystemOverride(key: keyof SystemPromptConfig, value: string): void {
    this.customSystemOverrides[key] = value;
  }

  clearSystemOverrides(): void {
    this.customSystemOverrides = {};
  }

  // ============================================
  // DEVELOPER PROMPT (Per session/character)
  // ============================================

  buildDeveloperPrompt(customDirectives?: string): string {
    const config = { ...this.developerConfig, ...this.customDeveloperOverrides };
    
    const sections = [
      '=== DEVELOPER PROMPT ===',
      '',
      config.contentFocus,
      '',
      config.dialogueRealism,
      '',
      config.povStructure,
      '',
      config.escalationRules,
    ];

    if (customDirectives || config.customDirectives) {
      sections.push('');
      sections.push('=== CUSTOM DIRECTIVES ===');
      sections.push(customDirectives || config.customDirectives || '');
    }

    return sections.join('\n');
  }

  setDeveloperOverride(key: keyof DeveloperPromptConfig, value: string): void {
    this.customDeveloperOverrides[key] = value;
  }

  clearDeveloperOverrides(): void {
    this.customDeveloperOverrides = {};
  }

  // ============================================
  // SCENE PROMPT (Dynamic, every turn)
  // ============================================

  buildScenePrompt(
    sceneState: SceneState,
    unresolvedActions: TrackedAction[],
    userModelNotes?: UserProfileMemory
  ): string {
    const sections: string[] = ['=== SCENE STATE ==='];

    // Location & Layout
    sections.push(`• Location: ${sceneState.location.name}`);
    sections.push(`• Spatial layout: ${sceneState.location.spatialLayout}`);
    
    // Environment
    sections.push(`• Lighting / atmosphere: ${sceneState.environment.lighting}, ${sceneState.environment.ambiance}`);
    if (sceneState.environment.soundscape) {
      sections.push(`• Soundscape: ${sceneState.environment.soundscape}`);
    }
    if (sceneState.environment.temperature) {
      sections.push(`• Temperature: ${sceneState.environment.temperature}`);
    }

    // Characters
    const activeChars = sceneState.characters.map(c => {
      let desc = c.name;
      if (c.position) desc += ` (${c.position})`;
      return desc;
    }).join(', ');
    sections.push(`• Active characters: ${activeChars || 'None'}`);

    // NPCs
    if (sceneState.npcs.length > 0) {
      const npcList = sceneState.npcs.map(npc => {
        let desc = npc.name;
        if (npc.position) desc += ` (${npc.position})`;
        if (npc.autonomy > 0.5) desc += ' [autonomous]';
        return desc;
      }).join(', ');
      sections.push(`• NPCs present: ${npcList}`);
    } else {
      sections.push(`• NPCs present: None`);
    }

    // Physical States
    const physicalStates = sceneState.characters
      .filter(c => c.physicalState.effects.length > 0 || c.physicalState.injuries.length > 0)
      .map(c => {
        const effects = [...c.physicalState.effects, ...c.physicalState.injuries];
        return `${c.name}: ${effects.join(', ')}`;
      });
    
    if (physicalStates.length > 0) {
      sections.push(`• Physical states: ${physicalStates.join('; ')}`);
    }

    // Emotional Tone
    const emotionalSummary = sceneState.characters
      .map(c => `${c.name}: ${c.emotionalState.primary}${c.emotionalState.secondary ? `/${c.emotionalState.secondary}` : ''} (${c.emotionalState.intensity}/10)`)
      .join('; ');
    sections.push(`• Emotional tone: ${emotionalSummary}`);

    // Unresolved Actions (CRITICAL)
    if (unresolvedActions.length > 0) {
      sections.push('');
      sections.push('• UNRESOLVED ACTIONS (must be addressed):');
      unresolvedActions.forEach((action, idx) => {
        sections.push(`  ${idx + 1}. [${action.actionType}] ${action.rawText}`);
      });
    }

    // Escalation Phase
    sections.push(`• Current escalation phase: ${this.formatEscalationPhase(sceneState.narrative.escalationPhase)}`);
    sections.push(`• Tension level: ${sceneState.narrative.tension}/10`);
    sections.push(`• Pacing: ${sceneState.narrative.pacing}`);

    // Recent Events Summary (token-efficient)
    if (sceneState.narrative.recentEvents.length > 0) {
      sections.push('');
      sections.push('• Recent events (context):');
      sceneState.narrative.recentEvents.slice(-3).forEach(event => {
        sections.push(`  - ${event}`);
      });
    }

    // User Model Notes (if available and useful)
    if (userModelNotes) {
      sections.push('');
      sections.push('USER MODEL NOTES:');
      if (userModelNotes.pacingPreference) {
        sections.push(`• Pacing preference: ${userModelNotes.pacingPreference}`);
      }
      if (userModelNotes.interactionStyle.length > 0) {
        sections.push(`• Interaction style: ${userModelNotes.interactionStyle.join(', ')}`);
      }
      if (userModelNotes.patterns.length > 0) {
        sections.push(`• Notable patterns: ${userModelNotes.patterns.join(', ')}`);
      }
    }

    return sections.join('\n');
  }

  private formatEscalationPhase(phase: EscalationPhase): string {
    const phaseDescriptions: Record<EscalationPhase, string> = {
      'introduction': 'Introduction (establishing)',
      'tension-building': 'Tension Building (subtle escalation)',
      'rising-action': 'Rising Action (active escalation)',
      'climax': 'Climax (peak intensity)',
      'resolution': 'Resolution (winding down)',
      'aftermath': 'Aftermath (consequences)',
    };
    return phaseDescriptions[phase] || phase;
  }

  // ============================================
  // COMBINED PROMPT BUILDER
  // ============================================

  buildFullPrompt(
    characterName: string,
    characterDescription: string,
    characterPersonality: string,
    sceneState: SceneState,
    unresolvedActions: TrackedAction[],
    userModelNotes?: UserProfileMemory,
    customDirectives?: string
  ): string {
    const systemPrompt = this.buildSystemPrompt();
    const developerPrompt = this.buildDeveloperPrompt(customDirectives);
    const scenePrompt = this.buildScenePrompt(sceneState, unresolvedActions, userModelNotes);

    // Character context section
    const characterContext = [
      '=== CHARACTER CONTEXT ===',
      `You are ${characterName}.`,
      '',
      `Description: ${characterDescription}`,
      '',
      `Personality: ${characterPersonality}`,
    ].join('\n');

    return [
      systemPrompt,
      '',
      developerPrompt,
      '',
      characterContext,
      '',
      scenePrompt,
    ].join('\n');
  }

  // ============================================
  // TOKEN ESTIMATION
  // ============================================

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  buildTokenEfficientScenePrompt(
    sceneState: SceneState,
    unresolvedActions: TrackedAction[],
    maxTokens: number = 500
  ): string {
    let prompt = this.buildScenePrompt(sceneState, unresolvedActions);
    
    // If over budget, progressively trim
    while (this.estimateTokens(prompt) > maxTokens) {
      // Remove recent events first
      if (sceneState.narrative.recentEvents.length > 0) {
        sceneState.narrative.recentEvents.pop();
        prompt = this.buildScenePrompt(sceneState, unresolvedActions);
        continue;
      }
      
      // Then trim physical state details
      sceneState.characters.forEach(c => {
        if (c.physicalState.effects.length > 2) {
          c.physicalState.effects = c.physicalState.effects.slice(0, 2);
        }
      });
      prompt = this.buildScenePrompt(sceneState, unresolvedActions);
      
      // If still over, truncate descriptions
      if (this.estimateTokens(prompt) > maxTokens) {
        break; // Accept as-is rather than lose critical data
      }
    }

    return prompt;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createPromptLayerManager(
  customSystem?: Partial<SystemPromptConfig>,
  customDeveloper?: Partial<DeveloperPromptConfig>
): PromptLayerManager {
  const systemConfig = { ...DEFAULT_SYSTEM_PROMPT, ...customSystem };
  const developerConfig = { ...DEFAULT_DEVELOPER_PROMPT, ...customDeveloper };
  
  return new PromptLayerManager(systemConfig, developerConfig);
}
