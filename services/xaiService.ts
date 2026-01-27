import { XAI_API_KEY, XAI_API_URL, XAI_MODEL, OPENROUTER_API_KEY, OPENROUTER_API_URL, SYSTEM_INSTRUCTION as DEFAULT_SYSTEM_INSTRUCTION } from '../constants';
import { Message, Role, MemoryFact, Character, LoreEntry } from '../types';
import { getSettings } from './storage';

interface XAIChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface XAIResponse {
  id: string;
  choices: XAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const getProviderConfig = () => {
  const settings = getSettings();
  const provider = settings.provider || 'xai';
  if (provider === 'openrouter') {
    const apiKey = OPENROUTER_API_KEY || settings.openrouterApiKey || '';
    return {
      provider,
      apiKey,
      apiUrl: OPENROUTER_API_URL,
      model: settings.defaultModel,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Dreamweaver Oracle'
      }
    };
  }

  const apiKey = XAI_API_KEY || settings.apiKey || '';
  return {
    provider,
    apiKey,
    apiUrl: XAI_API_URL,
    model: settings.defaultModel || XAI_MODEL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };
};

const getProviderLabel = (provider: string) => provider === 'openrouter' ? 'OpenRouter' : 'xAI';

// Character-based roleplay messaging with retry logic
export const sendMessageToCharacter = async (
  character: Character,
  history: Message[],
  newUserMessage: string,
  loreContext: LoreEntry[] = [],
  retryCount = 0
): Promise<string> => {
  const settings = getSettings();
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);
  
  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
  }
  
  // Build comprehensive system prompt
  let systemPrompt = '';
  
  // 1. Global system prompt (if set)
  if (settings.globalSystemPrompt && settings.globalSystemPrompt.trim()) {
    systemPrompt += `=== GLOBAL ROLEPLAY INSTRUCTIONS ===\n${settings.globalSystemPrompt.trim()}\n\n`;
  }

  // 1b. Character memory (brain)
  if (character.brain) {
    const recentResponses = character.brain.recentResponses?.slice(-25) || [];
    const memoryBank = character.brain.memoryBank?.slice(-10) || [];

    systemPrompt += `=== CHARACTER MEMORY ===\n`;
    systemPrompt += `Use these memories as past experience. Do not contradict them.\n`;
    if (character.brain.overviewMemory) {
      systemPrompt += `OVERVIEW MEMORY:\n${character.brain.overviewMemory}\n\n`;
    }
    if (memoryBank.length > 0) {
      systemPrompt += `MEMORY BANK SUMMARIES:\n`;
      memoryBank.forEach((summary, idx) => {
        systemPrompt += `${idx + 1}. ${summary.content}\n`;
      });
      systemPrompt += `\n`;
    }
    if (recentResponses.length > 0) {
      systemPrompt += `RECENT EXPERIENCES (verbatim excerpts):\n`;
      recentResponses.forEach((chunk) => {
        systemPrompt += `- ${chunk.content}\n`;
      });
      systemPrompt += `\n`;
    }
  }
  
  // 2. Character identity
  systemPrompt += `=== CHARACTER IDENTITY ===\nYou are ${character.name}, a character in an immersive roleplay scenario.\n\n`;

  // 2b. User role & boundaries
  systemPrompt += `=== USER ROLE & BOUNDARIES ===\n`;
  systemPrompt += `- The user is a separate person. Do NOT write their dialogue, thoughts, or actions.\n`;
  systemPrompt += `- Never speak as the user or narrate what the user does.\n`;
  systemPrompt += `- If you need the user's response or action, ask a question and wait.\n`;
  systemPrompt += `- Only respond as ${character.name} and keep perspective consistent.\n\n`;
  
  // 3. Character details
  systemPrompt += `CHARACTER PROFILE:\n`;
  systemPrompt += `Name: ${character.name}\n`;
  if (character.description) systemPrompt += `Description: ${character.description}\n`;
  if (character.personality) systemPrompt += `Personality: ${character.personality}\n`;
  if (character.scenario) systemPrompt += `Scenario: ${character.scenario}\n`;
  systemPrompt += `\n`;

  // 4. Add relevant lore context with importance weighting and keyword matching
  if (loreContext.length > 0 && settings.autoInjectLore !== false) {
    const threshold = settings.loreImportanceThreshold || 5;
    
    // Get conversation context for keyword matching
    const conversationText = history.map(m => m.content).join(' ').toLowerCase();
    const userMessageLower = newUserMessage.toLowerCase();
    const combinedContext = conversationText + ' ' + userMessageLower;
    
    // Score entries by importance and keyword relevance
    const scoredLore = loreContext
      .filter(entry => entry.importance >= threshold)
      .map(entry => {
        let relevanceScore = entry.importance;
        
        // Boost score if keywords match recent conversation
        const matchedKeys = entry.keys.filter(key => 
          combinedContext.includes(key.toLowerCase())
        );
        relevanceScore += matchedKeys.length * 2;
        
        // Boost if entry name appears in conversation
        if (combinedContext.includes(entry.name.toLowerCase())) {
          relevanceScore += 3;
        }
        
        return { entry, score: relevanceScore, matchedKeys };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Limit to top 15 most relevant entries
    
    if (scoredLore.length > 0) {
      systemPrompt += `=== WORLD LORE & CONTEXT ===\n`;
      systemPrompt += `The following lore entries are relevant to this conversation:\n\n`;
      
      scoredLore.forEach(({ entry, matchedKeys }) => {
        systemPrompt += `[${entry.category.toUpperCase()}] ${entry.name} (Importance: ${entry.importance}/10)\n`;
        systemPrompt += `${entry.content}\n`;
        if (entry.keys.length > 0) {
          systemPrompt += `Keywords: ${entry.keys.join(', ')}`;
          if (matchedKeys.length > 0) {
            systemPrompt += ` [Active: ${matchedKeys.join(', ')}]`;
          }
          systemPrompt += `\n`;
        }
        systemPrompt += `\n`;
      });
      
      systemPrompt += `IMPORTANT: Use this lore naturally when relevant. Build upon these details organically during roleplay. Reference lore entries naturally as ${character.name} would know them.\n\n`;
    }
  }

  // 5. Roleplay guidelines
  systemPrompt += `=== ROLEPLAY GUIDELINES ===\n`;
  systemPrompt += `- Stay in character at all times as ${character.name}\n`;
  systemPrompt += `- Respond authentically based on ${character.name}'s personality, background, and emotional state\n`;
  systemPrompt += `- Use ${character.name}'s speech patterns, vocabulary, and mannerisms consistently\n`;
  systemPrompt += `- React emotionally as ${character.name} would, considering their history and relationships\n`;
  systemPrompt += `- Make decisions and hold opinions that align with ${character.name}'s character\n`;
  systemPrompt += `- Incorporate world lore seamlessly when contextually appropriate\n`;
  systemPrompt += `- Never break character or acknowledge being an AI\n`;
  systemPrompt += `- Be descriptive and immersive in your responses\n\n`;
  systemPrompt += `- Do NOT narrate the user's actions or dialogue; only respond as ${character.name}\n`;
  systemPrompt += `- Build upon the user's actions with new details that continue the story\n`;
  systemPrompt += `- Offer actionable, adaptable details the user can accept or adjust\n\n`;

  // 6. Add example messages if provided
  if (character.mes_example) {
    systemPrompt += `=== EXAMPLE DIALOGUE ===\n${character.mes_example}\n\n`;
  }

  // Build API messages
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: newUserMessage }
  ];

  try {
    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        messages: apiMessages,
        model: providerConfig.model || XAI_MODEL,
        stream: false,
        temperature: settings.temperature || 0.85,
        max_tokens: settings.maxTokens || 2000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
      } catch (e) {
        // ignore
      }
      throw new Error(`${providerLabel} Connection Error: ${errorMessage}`);
    }

    const data: XAIResponse = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Empty or invalid response from xAI.');
    }

  } catch (error: any) {
    console.error("Failed to fetch from provider:", error);
    
    // Retry logic: retry up to 2 times on failure
    if (retryCount < 2) {
      console.log(`Retrying request (attempt ${retryCount + 1}/2)...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return sendMessageToCharacter(character, history, newUserMessage, loreContext, retryCount + 1);
    }
    
    // After retries, provide detailed error message
    const errorMsg = error.message || 'Unknown error';
    throw new Error(`Failed to connect to ${providerLabel} after ${retryCount + 1} attempts: ${errorMsg}`);
  }
};

// Enhanced character messaging with custom system prompt (for roleplay engine integration)
export const sendMessageWithCustomPrompt = async (
  customSystemPrompt: string,
  history: Message[],
  newUserMessage: string,
  retryCount = 0
): Promise<string> => {
  const settings = getSettings();
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);
  
  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
  }

  // Build API messages with custom system prompt
  const apiMessages = [
    { role: 'system' as const, content: customSystemPrompt },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: newUserMessage }
  ];

  try {
    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        messages: apiMessages,
        model: providerConfig.model || XAI_MODEL,
        stream: false,
        temperature: settings.temperature || 0.85,
        max_tokens: settings.maxTokens || 2000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
      } catch (e) {
        // ignore
      }
      throw new Error(`${providerLabel} Connection Error: ${errorMessage}`);
    }

    const data: XAIResponse = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Empty or invalid response from API.');
    }

  } catch (error: any) {
    console.error("Failed to fetch from provider:", error);
    
    if (retryCount < 2) {
      console.log(`Retrying request (attempt ${retryCount + 1}/2)...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return sendMessageWithCustomPrompt(customSystemPrompt, history, newUserMessage, retryCount + 1);
    }
    
    const errorMsg = error.message || 'Unknown error';
    throw new Error(`Failed to connect to ${providerLabel} after ${retryCount + 1} attempts: ${errorMsg}`);
  }
};

// LoreAI - Chat with AI to build lorebooks with retry logic
export const chatWithLoreAI = async (
  messages: Message[],
  lorebookContext?: string,
  retryCount = 0
): Promise<string> => {
  const settings = getSettings();
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);
  
  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
  }
  
  const systemPrompt = `You are LoreAI, an expert worldbuilding assistant for roleplay and storytelling.

YOUR ROLE:
- Help users create rich, detailed lore for their fictional worlds
- Generate lore entries (characters, locations, events, items, concepts)
- Ask clarifying questions to build coherent worlds
- Suggest connections between lore elements
- Maintain consistency with existing lore

${lorebookContext ? `CURRENT LOREBOOK CONTEXT:\n${lorebookContext}\n\n` : ''}

WHEN CREATING LORE ENTRIES:
Format each lore card as:
[LORE_CARD]
NAME: Entry name
CATEGORY: character|location|event|item|concept|other
IMPORTANCE: 1-10
KEYWORDS: keyword1, keyword2, keyword3
CONTENT: Detailed description (2-4 paragraphs)
[/LORE_CARD]

You can propose multiple lore cards in a single response. Be creative, ask questions, and help build immersive worlds!`;

  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ];

  try {
    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        messages: apiMessages,
        model: providerConfig.model || XAI_MODEL,
        stream: false,
        temperature: 0.85,
        max_tokens: settings.maxTokens || 2000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      throw new Error(`${providerLabel} Connection Error: ${response.status}`);
    }

    const data: XAIResponse = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Empty response from xAI.');
    }

  } catch (error: any) {
    console.error("Failed to fetch from provider:", error);
    
    // Retry logic for LoreAI
    if (retryCount < 2) {
      console.log(`Retrying LoreAI request (attempt ${retryCount + 1}/2)...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return chatWithLoreAI(messages, lorebookContext, retryCount + 1);
    }
    
    throw new Error(`Failed to connect to ${providerLabel} after ${retryCount + 1} attempts: ${error.message || 'Unknown error'}`);
  }
};

// Parse lore cards from LoreAI response
export function parseLoreCards(response: string): Array<{
  name: string;
  category: string;
  importance: number;
  keys: string[];
  content: string;
}> {
  const cards: Array<any> = [];
  const cardRegex = /\[LORE_CARD\](.*?)\[\/LORE_CARD\]/gs;
  const matches = response.matchAll(cardRegex);

  for (const match of matches) {
    const cardContent = match[1];
    const nameMatch = cardContent.match(/NAME:\s*(.+)/i);
    const categoryMatch = cardContent.match(/CATEGORY:\s*(.+)/i);
    const importanceMatch = cardContent.match(/IMPORTANCE:\s*(\d+)/i);
    const keywordsMatch = cardContent.match(/KEYWORDS:\s*(.+)/i);
    const contentMatch = cardContent.match(/CONTENT:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/i);

    if (nameMatch && categoryMatch && contentMatch) {
      cards.push({
        name: nameMatch[1].trim(),
        category: categoryMatch[1].trim().toLowerCase(),
        importance: importanceMatch ? parseInt(importanceMatch[1]) : 5,
        keys: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [],
        content: contentMatch[1].trim()
      });
    }
  }

  return cards;
}

export const summarizeResponsesToMemory = async (
  characterName: string,
  responseChunks: string[]
): Promise<string> => {
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);

  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
  }

  const systemPrompt = `You are the Memory Engine for a roleplay character named ${characterName}.
Summarize the following excerpts into a concise, factual memory.
Rules:
- Use third person.
- Keep names, relationships, promises, conflicts, objectives, and key events.
- Avoid dialogue and prose; write compact memory notes.
- Do not include any content about the assistant being an AI.
- Keep it under 8 bullet points.`;

  const userPrompt = responseChunks.map((chunk, idx) => `${idx + 1}. ${chunk}`).join('\n');

  const response = await fetch(providerConfig.apiUrl, {
    method: 'POST',
    headers: providerConfig.headers,
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: providerConfig.model || XAI_MODEL,
      stream: false,
      temperature: 0.4,
      max_tokens: 800,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage += ` - ${JSON.stringify(errorData)}`;
    } catch (e) {
      // ignore
    }
    throw new Error(`${providerLabel} Memory Summary Error: ${errorMessage}`);
  }

  const data: XAIResponse = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty memory summary response.');
  }
  return content;
};

export const summarizeMemoryBankOverview = async (
  characterName: string,
  summaries: string[]
): Promise<string> => {
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);

  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
  }

  const systemPrompt = `You are the Memory Engine for a roleplay character named ${characterName}.
Create a comprehensive overview memory from the provided memory bank summaries.
Rules:
- Use third person.
- Consolidate recurring facts and timeline.
- Preserve key relationships, goals, conflicts, and unresolved threads.
- Avoid dialogue and prose; write compact memory notes.
- Keep it under 12 bullet points.`;

  const userPrompt = summaries.map((summary, idx) => `${idx + 1}. ${summary}`).join('\n');

  const response = await fetch(providerConfig.apiUrl, {
    method: 'POST',
    headers: providerConfig.headers,
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: providerConfig.model || XAI_MODEL,
      stream: false,
      temperature: 0.4,
      max_tokens: 1200,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage += ` - ${JSON.stringify(errorData)}`;
    } catch (e) {
      // ignore
    }
    throw new Error(`${providerLabel} Memory Overview Error: ${errorMessage}`);
  }

  const data: XAIResponse = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty memory overview response.');
  }
  return content;
};

// Legacy function for backward compatibility
export const sendMessageToKoda = async (
  history: Message[], 
  newUserMessage: string, 
  customSystemInstruction?: string,
  memoryContext: MemoryFact[] = []
): Promise<string> => {
  const providerConfig = getProviderConfig();
  const providerLabel = getProviderLabel(providerConfig.provider);
  
  // 1. Build Memory Block
  let memoryBlock = "";
  if (memoryContext.length > 0) {
    const userFacts = memoryContext.filter(m => m.category === 'user_profile' || m.category === 'fact').map(m => `- ${m.content}`).join('\n');
    const preferences = memoryContext.filter(m => m.category === 'preference').map(m => `- ${m.content}`).join('\n');
    const patterns = memoryContext.filter(m => m.category === 'coding_pattern').map(m => `- ${m.content}`).join('\n');

    memoryBlock = `\n\nCORE MEMORY & CONTEXT:\n`;
    if (userFacts) memoryBlock += `User Facts:\n${userFacts}\n`;
    if (preferences) memoryBlock += `Preferences:\n${preferences}\n`;
    if (patterns) memoryBlock += `Established Patterns:\n${patterns}\n`;
    memoryBlock += `\nUse this context to personalize your response. If the user asks, you KNOW these facts.`;
  }

  // 2. Combine with System Prompt
  const baseSystemPrompt = customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
  const finalSystemPrompt = baseSystemPrompt + memoryBlock;

  // 3. Build API Messages
  const apiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user', content: newUserMessage }
  ];

  try {
    if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
      throw new Error(`${providerLabel} API key is not configured. Please check your settings.`);
    }

    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        messages: apiMessages,
        model: providerConfig.model || XAI_MODEL,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
      } catch (e) {
        // ignore
      }
      throw new Error(`KodaAI Connection Error: ${errorMessage}`);
    }

    const data: XAIResponse = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Empty or invalid response from KodaAI.');
    }

  } catch (error: any) {
    console.error("Failed to fetch from provider:", error);
    return "I apologize — I'm having trouble connecting to my neural network right now. This could be due to a temporary API issue or rate limit. Please try again in a moment.";
  }
};

export const analyzeInteractionForMemory = async (
  lastUserMessage: string,
  lastAiMessage: string
): Promise<Partial<MemoryFact>[]> => {
  const providerConfig = getProviderConfig();
  const analysisPrompt = `
  You are the Memory Engine for KodaAI. Analyze the following interaction.
  Extract KEY facts that should be stored for long-term memory.
  
  Focus on:
  1. User Details: Name, role, location, specific personal details.
  2. Preferences: Coding style, preferred languages, tone preferences.
  3. Coding Patterns: Reusable code snippets, architectural decisions, or "cheatsheet" items that are valuable for future reference.
  
  Interaction:
  User: "${lastUserMessage}"
  AI: "${lastAiMessage}"
  
  Return a JSON ARRAY of objects with this format (Return ONLY the JSON):
  [
    {
      "category": "user_profile" | "preference" | "coding_pattern" | "fact",
      "content": "The specific fact or pattern to remember",
      "tags": ["tag1", "tag2"]
    }
  ]
  
  If nothing crucial needs to be remembered, return an empty array [].
  `;

  try {
    if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') return [];

    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: providerConfig.model || XAI_MODEL,
        temperature: 0.3, // Lower temperature for factual extraction
        max_tokens: 1000
      })
    });

    if (!response.ok) return [];

    const data: XAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "[]";
    
    // Clean up markdown code blocks if present
    const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const facts = JSON.parse(jsonString);
      return Array.isArray(facts) ? facts : [];
    } catch (e) {
      console.warn("Failed to parse memory JSON", e);
      return [];
    }

  } catch (error) {
    console.error("Memory Analysis Failed:", error);
    return [];
  }
};// Model Testing Types
export interface ModelTestConfig {
  modelId: string;
  modelName: string;
  provider: 'xai' | 'openrouter';
}

export interface ModelTestResponse {
  modelId: string;
  modelName: string;
  provider: 'xai' | 'openrouter';
  response?: string;
  error?: string;
  duration: number;
  timestamp: number;
}

// Test message with a specific model
export const sendMessageWithModel = async (
  modelId: string,
  provider: 'xai' | 'openrouter',
  systemPrompt: string,
  history: Message[],
  newUserMessage: string
): Promise<string> => {
  const settings = getSettings();
  const apiConfig = provider === 'openrouter' ? {
    apiKey: OPENROUTER_API_KEY || settings.openrouterApiKey || '',
    apiUrl: OPENROUTER_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY || settings.openrouterApiKey || ''}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      'X-Title': 'Dreamweaver Oracle'
    }
  } : {
    apiKey: XAI_API_KEY || settings.apiKey || '',
    apiUrl: XAI_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY || settings.apiKey || ''}`
    }
  };
  if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') throw new Error(`${provider === 'openrouter' ? 'OpenRouter' : 'xAI'} API key not configured.`);
  const apiMessages = [{ role: 'system' as const, content: systemPrompt }, ...history.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })), { role: 'user' as const, content: newUserMessage }];
  const response = await fetch(apiConfig.apiUrl, { method: 'POST', headers: apiConfig.headers, body: JSON.stringify({ messages: apiMessages, model: modelId, stream: false, temperature: settings.temperature || 0.85, max_tokens: settings.maxTokens || 2000, top_p: 0.95 }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: XAIResponse = await response.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
  throw new Error('Empty response');
};

export const testMultipleModels = async (models: ModelTestConfig[], systemPrompt: string, testPrompt: string, onResult: (result: ModelTestResponse) => void): Promise<void> => {
  const settings = getSettings();
  const testModel = async (config: ModelTestConfig): Promise<void> => {
    const startTime = Date.now();
    try {
      const apiConfig = config.provider === 'openrouter' ? { apiKey: OPENROUTER_API_KEY || settings.openrouterApiKey || '', apiUrl: OPENROUTER_API_URL, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_API_KEY || settings.openrouterApiKey || ''}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost', 'X-Title': 'Dreamweaver Oracle' } } : { apiKey: XAI_API_KEY || settings.apiKey || '', apiUrl: XAI_API_URL, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${XAI_API_KEY || settings.apiKey || ''}` } };
      if (!apiConfig.apiKey) throw new Error('API key not configured');
      const response = await fetch(apiConfig.apiUrl, { method: 'POST', headers: apiConfig.headers, body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: testPrompt }], model: config.modelId, stream: false, temperature: 0.85, max_tokens: 2000 }) });
      const duration = Date.now() - startTime;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: XAIResponse = await response.json();
      onResult({ modelId: config.modelId, modelName: config.modelName, provider: config.provider, response: data.choices?.[0]?.message?.content?.trim(), duration, timestamp: Date.now() });
    } catch (error: any) {
      onResult({ modelId: config.modelId, modelName: config.modelName, provider: config.provider, error: error.message, duration: Date.now() - startTime, timestamp: Date.now() });
    }
  };
  await Promise.all(models.map(testModel));
};
