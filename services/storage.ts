import { Character, ChatNode, LoreEntry, Lorebook, AppSettings } from '../types';

// Storage Keys
const STORAGE_KEYS = {
  CHARACTERS: 'rp_characters',
  NODES: 'rp_nodes',
  LORE_ENTRIES: 'rp_lore_entries',
  LOREBOOKS: 'rp_lorebooks',
  SETTINGS: 'rp_settings',
};

// Helper function
export const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// --- Characters ---
export function getCharacters(): Character[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
  return data ? JSON.parse(data) : [];
}

export function getCharacter(id: string): Character | undefined {
  return getCharacters().find(c => c.id === id);
}

export function saveCharacter(character: Character): void {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === character.id);
  if (index >= 0) {
    characters[index] = { ...character, updatedAt: Date.now() };
  } else {
    characters.push(character);
  }
  localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
}

export function deleteCharacter(id: string): void {
  const characters = getCharacters().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  
  // Also delete related nodes
  const nodes = getNodes().filter(n => n.characterId !== id);
  localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
}

// --- Chat Nodes ---
export function getNodes(): ChatNode[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.NODES);
  return data ? JSON.parse(data) : [];
}

export function getNode(id: string): ChatNode | undefined {
  return getNodes().find(n => n.id === id);
}

export function getNodesForCharacter(characterId: string): ChatNode[] {
  return getNodes().filter(n => n.characterId === characterId);
}

export function saveNode(node: ChatNode): void {
  const nodes = getNodes();
  const index = nodes.findIndex(n => n.id === node.id);
  if (index >= 0) {
    nodes[index] = { ...node, updatedAt: Date.now() };
  } else {
    nodes.push(node);
  }
  localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
}

export function deleteNode(id: string): void {
  const nodes = getNodes().filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
}

// --- Lore Entries ---
export function getLoreEntries(): LoreEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.LORE_ENTRIES);
  return data ? JSON.parse(data) : [];
}

export function getLoreEntry(id: string): LoreEntry | undefined {
  return getLoreEntries().find(e => e.id === id);
}

export function saveLoreEntry(entry: LoreEntry): void {
  const entries = getLoreEntries();
  const index = entries.findIndex(e => e.id === entry.id);
  if (index >= 0) {
    entries[index] = { ...entry, updatedAt: Date.now() };
  } else {
    entries.push(entry);
  }
  localStorage.setItem(STORAGE_KEYS.LORE_ENTRIES, JSON.stringify(entries));
}

export function deleteLoreEntry(id: string): void {
  const entries = getLoreEntries().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.LORE_ENTRIES, JSON.stringify(entries));
  
  // Remove from lorebooks
  const lorebooks = getLorebooks();
  lorebooks.forEach(book => {
    book.entries = book.entries.filter(eId => eId !== id);
  });
  localStorage.setItem(STORAGE_KEYS.LOREBOOKS, JSON.stringify(lorebooks));
}

// --- Lorebooks ---
export function getLorebooks(): Lorebook[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.LOREBOOKS);
  return data ? JSON.parse(data) : [];
}

export function getLorebook(id: string): Lorebook | undefined {
  return getLorebooks().find(b => b.id === id);
}

export function saveLorebook(lorebook: Lorebook): void {
  const lorebooks = getLorebooks();
  const index = lorebooks.findIndex(b => b.id === lorebook.id);
  if (index >= 0) {
    lorebooks[index] = { ...lorebook, updatedAt: Date.now() };
  } else {
    lorebooks.push(lorebook);
  }
  localStorage.setItem(STORAGE_KEYS.LOREBOOKS, JSON.stringify(lorebooks));
}

export function deleteLorebook(id: string): void {
  const lorebooks = getLorebooks().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.LOREBOOKS, JSON.stringify(lorebooks));
}

// --- Settings ---
export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return {
      apiKey: '',
      openrouterApiKey: '',
      provider: 'xai',
      defaultModel: 'grok-4-1-fast-reasoning',
      temperature: 0.85,
      maxTokens: 2000,
      theme: 'dark',
      globalSystemPrompt: '',
      loreImportanceThreshold: 5,
      autoInjectLore: true,
    };
  }
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (data) {
    return JSON.parse(data);
  }
  return {
    apiKey: '',
    openrouterApiKey: '',
    provider: 'xai',
    defaultModel: 'grok-4-1-fast-reasoning',
    temperature: 0.85,
    maxTokens: 2000,
    theme: 'dark',
    globalSystemPrompt: '',
    loreImportanceThreshold: 5,
    autoInjectLore: true,
  };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Utilities ---
export function exportCharacter(character: Character): string {
  return JSON.stringify(character, null, 2);
}

/**
 * Export character as interactive HTML profile
 * Includes character info, gallery, and chat nodes (read-only)
 */
export async function exportCharacterHTML(
  character: Character, 
  galleryItems: any[], 
  chatNodes: ChatNode[]
): Promise<string> {
  // Convert gallery items to base64 for embedding
  const embeddedGallery = await Promise.all(
    galleryItems.map(async (item) => {
      if (item.type === 'embed') {
        return { ...item, embedded: true };
      }
      if (item.url) {
        try {
          const response = await fetch(item.url);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { ...item, url: base64, embedded: true };
        } catch (err) {
          return { ...item, embedded: false };
        }
      }
      return item;
    })
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${character.name} - Character Profile</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      line-height: 1.6;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      padding: 40px;
      text-align: center;
      position: relative;
    }
    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid white;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .tabs {
      display: flex;
      background: rgba(30, 41, 59, 0.8);
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }
    .tab {
      flex: 1;
      padding: 16px 24px;
      text-align: center;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
      border-bottom: 3px solid transparent;
    }
    .tab:hover { color: #06b6d4; }
    .tab.active {
      color: #06b6d4;
      border-bottom-color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
    }
    .content {
      padding: 40px;
      display: none;
    }
    .content.active { display: block; }
    .info-grid {
      display: grid;
      gap: 24px;
    }
    .info-card {
      background: rgba(30, 41, 59, 0.5);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .info-card h3 {
      color: #06b6d4;
      margin-bottom: 12px;
      font-size: 1.2em;
    }
    .info-card p {
      color: #cbd5e1;
      white-space: pre-wrap;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }
    .gallery-item {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .gallery-item:hover { transform: scale(1.05); }
    .gallery-item img, .gallery-item video {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }
    .gallery-item .name {
      padding: 12px;
      font-size: 14px;
      color: #e2e8f0;
      background: rgba(15, 23, 42, 0.8);
    }
    .chat-node {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .chat-node h3 {
      color: #06b6d4;
      margin-bottom: 16px;
      font-size: 1.3em;
    }
    .message {
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 12px;
      max-width: 80%;
    }
    .message.user {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      margin-left: auto;
      color: white;
    }
    .message.assistant {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .message .role {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 8px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .message .content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }
    .modal-content img, .modal-content video {
      max-width: 100%;
      max-height: 90vh;
      border-radius: 12px;
    }
    .modal-close {
      position: absolute;
      top: -40px;
      right: 0;
      background: #06b6d4;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(6, 182, 212, 0.2);
      color: #06b6d4;
      border-radius: 12px;
      font-size: 12px;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    .timestamp {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
    .embed-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
    }
    .embed-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    }
    .watermark {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${character.avatar ? `<img src="${character.avatar}" alt="${character.name}" class="avatar">` : ''}
      <h1>${character.name}</h1>
      ${character.description ? `<p>${character.description}</p>` : ''}
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('info')">Profile</button>
      <button class="tab" onclick="showTab('gallery')">Gallery (${embeddedGallery.length})</button>
      <button class="tab" onclick="showTab('chats')">Conversations (${chatNodes.length})</button>
    </div>

    <div id="info" class="content active">
      <div class="info-grid">
        ${character.personality ? `
          <div class="info-card">
            <h3>🎭 Personality</h3>
            <p>${character.personality}</p>
          </div>
        ` : ''}
        ${character.scenario ? `
          <div class="info-card">
            <h3>📖 Scenario</h3>
            <p>${character.scenario}</p>
          </div>
        ` : ''}
        ${character.first_mes ? `
          <div class="info-card">
            <h3>💬 First Message</h3>
            <p>${character.first_mes}</p>
          </div>
        ` : ''}
        ${character.mes_example ? `
          <div class="info-card">
            <h3>💭 Example Dialogue</h3>
            <p>${character.mes_example}</p>
          </div>
        ` : ''}
        ${character.tags && character.tags.length > 0 ? `
          <div class="info-card">
            <h3>🏷️ Tags</h3>
            <div>
              ${character.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="info-card">
          <h3>ℹ️ Metadata</h3>
          <p class="timestamp">Created: ${new Date(character.createdAt).toLocaleString()}</p>
          <p class="timestamp">Last Updated: ${new Date(character.updatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>

    <div id="gallery" class="content">
      ${embeddedGallery.length > 0 ? `
        <div class="gallery-grid">
          ${embeddedGallery.map((item, idx) => {
            if (item.type === 'image') {
              return `
                <div class="gallery-item" onclick="openModal(${idx})">
                  <img src="${item.url}" alt="${item.name}">
                  <div class="name">${item.name}</div>
                </div>
              `;
            } else if (item.type === 'video') {
              return `
                <div class="gallery-item" onclick="openModal(${idx})">
                  <video src="${item.url}" ${item.thumbnail ? `poster="${item.thumbnail}"` : ''}></video>
                  <div class="name">${item.name}</div>
                </div>
              `;
            } else if (item.type === 'embed') {
              return `
                <div class="info-card">
                  <h3>${item.name}</h3>
                  ${item.embedUrl ? `
                    <div class="embed-container">
                      <iframe src="${item.embedUrl}" allowfullscreen></iframe>
                    </div>
                  ` : item.embedCode ? item.embedCode : ''}
                </div>
              `;
            }
            return '';
          }).join('')}
        </div>
      ` : '<p style="text-align: center; color: #64748b; padding: 40px;">No gallery items</p>'}
    </div>

    <div id="chats" class="content">
      ${chatNodes.length > 0 ? chatNodes.map(node => `
        <div class="chat-node">
          <h3>${node.title || 'Untitled Conversation'}</h3>
          <p class="timestamp">Created: ${new Date(node.createdAt).toLocaleString()}</p>
          <div style="margin-top: 20px;">
            ${node.messages.map(msg => `
              <div class="message ${msg.role}">
                <div class="role">${msg.role === 'user' ? 'User' : character.name}</div>
                <div class="content">${msg.content}</div>
                <div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('') : '<p style="text-align: center; color: #64748b; padding: 40px;">No conversations yet</p>'}
    </div>

    <div class="watermark">
      <p>Created with xKoda • ${new Date().toLocaleDateString()}</p>
      <p style="font-size: 12px; margin-top: 8px;">This is a read-only character profile export</p>
    </div>
  </div>

  <div id="modal" class="modal" onclick="closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div id="modal-body"></div>
    </div>
  </div>

  <script>
    const galleryData = ${JSON.stringify(embeddedGallery)};

    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    }

    function openModal(index) {
      const item = galleryData[index];
      const modal = document.getElementById('modal');
      const modalBody = document.getElementById('modal-body');
      
      if (item.type === 'image') {
        modalBody.innerHTML = \`<img src="\${item.url}" alt="\${item.name}">\`;
      } else if (item.type === 'video') {
        modalBody.innerHTML = \`<video src="\${item.url}" controls autoplay style="max-width: 100%; max-height: 90vh;"></video>\`;
      }
      
      modal.classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.getElementById('modal-body').innerHTML = '';
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Universal character import function
 * Supports multiple formats:
 * - TavernAI V1 (char_name, char_persona, etc.)
 * - TavernAI V2 (spec v2 with data object)
 * - CharacterAI format
 * - SillyTavern format
 * - Agnai format
 * - Native xKoda format
 * - Any custom JSON with character data
 */
export function importCharacter(jsonString: string): Character {
  try {
    const raw = JSON.parse(jsonString);
    
    // Helper to safely get string value
    const getString = (obj: any, ...keys: string[]): string => {
      for (const key of keys) {
        if (obj[key] && typeof obj[key] === 'string') {
          return obj[key].trim();
        }
      }
      return '';
    };
    
    // Helper to safely get array
    const getArray = (obj: any, ...keys: string[]): string[] => {
      for (const key of keys) {
        if (Array.isArray(obj[key])) {
          return obj[key];
        }
      }
      return [];
    };
    
    // Detect format and normalize
    let normalized: any = {};
    
    // Check if it's TavernAI V2 format (has spec and data)
    if (raw.spec === 'chara_card_v2' || raw.spec_version === '2.0') {
      const data = raw.data || raw;
      normalized = {
        name: getString(data, 'name', 'char_name', 'character_name'),
        description: getString(data, 'description', 'char_persona', 'persona', 'personality'),
        personality: getString(data, 'personality', 'char_persona', 'persona'),
        scenario: getString(data, 'scenario', 'world_scenario', 'context'),
        first_mes: getString(data, 'first_mes', 'first_message', 'greeting', 'char_greeting'),
        mes_example: getString(data, 'mes_example', 'example_dialogue', 'example_messages'),
        avatar: getString(data, 'avatar', 'image', 'profile_pic'),
        tags: getArray(data, 'tags', 'categories'),
        attachedLorebooks: getArray(data, 'character_book', 'lorebooks', 'attachedLorebooks'),
        data: data.extensions || data.metadata || {},
      };
    }
    // TavernAI V1 format (char_name, char_persona, etc.)
    else if (raw.char_name || raw.name) {
      normalized = {
        name: getString(raw, 'char_name', 'name', 'character_name'),
        description: getString(raw, 'description', 'char_persona', 'persona'),
        personality: getString(raw, 'personality', 'char_persona', 'persona'),
        scenario: getString(raw, 'scenario', 'world_scenario', 'context'),
        first_mes: getString(raw, 'first_mes', 'char_greeting', 'greeting', 'first_message'),
        mes_example: getString(raw, 'mes_example', 'example_dialogue', 'example_messages'),
        avatar: getString(raw, 'avatar', 'image', 'profile_pic', 'char_avatar'),
        tags: getArray(raw, 'tags', 'categories'),
        attachedLorebooks: getArray(raw, 'character_book', 'lorebooks', 'attachedLorebooks'),
      };
    }
    // Agnai format (typically has 'persona' and 'sampleChat')
    else if (raw.persona || raw.sampleChat) {
      normalized = {
        name: getString(raw, 'name', 'character_name'),
        description: getString(raw, 'persona', 'description', 'personality'),
        personality: getString(raw, 'persona', 'personality'),
        scenario: getString(raw, 'scenario', 'context', 'setting'),
        first_mes: getString(raw, 'greeting', 'first_message', 'firstMessage'),
        mes_example: getString(raw, 'sampleChat', 'example_dialogue', 'mes_example'),
        avatar: getString(raw, 'avatar', 'image', 'profile_pic'),
        tags: getArray(raw, 'tags', 'labels'),
      };
    }
    // Generic fallback - try common field names
    else {
      normalized = {
        name: getString(raw, 'name', 'char_name', 'character_name', 'characterName', 'displayName'),
        description: getString(raw, 'description', 'desc', 'bio', 'char_persona', 'persona', 'about'),
        personality: getString(raw, 'personality', 'char_persona', 'persona', 'traits'),
        scenario: getString(raw, 'scenario', 'world_scenario', 'context', 'setting', 'world'),
        first_mes: getString(raw, 'first_mes', 'firstMessage', 'greeting', 'char_greeting', 'intro'),
        mes_example: getString(raw, 'mes_example', 'example_dialogue', 'examples', 'sampleChat', 'example_messages'),
        avatar: getString(raw, 'avatar', 'image', 'profile_pic', 'icon', 'picture'),
        tags: getArray(raw, 'tags', 'categories', 'labels'),
        gallery: getArray(raw, 'gallery', 'images'),
        attachedLorebooks: getArray(raw, 'attachedLorebooks', 'lorebooks', 'character_book'),
      };
    }
    
    // Ensure required fields have defaults
    const character: Character = {
      id: generateId(),
      name: normalized.name || 'Unnamed Character',
      description: normalized.description || '',
      personality: normalized.personality || normalized.description || '',
      scenario: normalized.scenario || '',
      first_mes: normalized.first_mes || '',
      mes_example: normalized.mes_example || '',
      avatar: normalized.avatar,
      tags: normalized.tags || [],
      gallery: normalized.gallery || [],
      attachedLorebooks: normalized.attachedLorebooks || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: normalized.data || {},
    };
    
    // If personality is empty but description exists, use description
    if (!character.personality && character.description) {
      character.personality = character.description;
    }
    
    return character;
  } catch (error) {
    console.error('Failed to import character:', error);
    throw new Error('Invalid character JSON format. Please check the file and try again.');
  }
}

export function exportLorebook(lorebook: Lorebook): string {
  return JSON.stringify(lorebook, null, 2);
}

/**
 * Universal lorebook import function
 * Supports multiple formats:
 * - TavernAI character books
 * - SillyTavern lorebooks
 * - World Info formats
 * - Native xKoda format
 */
export function importLorebook(jsonString: string): Lorebook {
  try {
    const raw = JSON.parse(jsonString);
    
    // Helper functions
    const getString = (obj: any, ...keys: string[]): string => {
      for (const key of keys) {
        if (obj[key] && typeof obj[key] === 'string') {
          return obj[key].trim();
        }
      }
      return '';
    };
    
    const getArray = (obj: any, ...keys: string[]): any[] => {
      for (const key of keys) {
        if (Array.isArray(obj[key])) {
          return obj[key];
        }
      }
      return [];
    };
    
    // Parse entries from various formats
    const parseEntries = (entriesData: any[]): string[] => {
      return entriesData.map(entry => {
        // Create a lore entry
        const loreEntry: LoreEntry = {
          id: generateId(),
          name: getString(entry, 'name', 'key', 'title', 'keyword') || 'Entry',
          content: getString(entry, 'content', 'text', 'value', 'description', 'entry'),
          keys: Array.isArray(entry.keys) ? entry.keys : 
                Array.isArray(entry.keywords) ? entry.keywords :
                Array.isArray(entry.triggers) ? entry.triggers :
                entry.key ? [entry.key] : [],
          category: entry.category || 'other',
          importance: typeof entry.importance === 'number' ? entry.importance :
                     typeof entry.priority === 'number' ? entry.priority :
                     typeof entry.weight === 'number' ? entry.weight : 5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        // Save the entry
        saveLoreEntry(loreEntry);
        return loreEntry.id;
      });
    };
    
    let entryIds: string[] = [];
    let bookName = '';
    let bookDescription = '';
    
    // Detect format
    if (raw.entries && Array.isArray(raw.entries)) {
      // Standard format with entries array
      entryIds = parseEntries(raw.entries);
      bookName = getString(raw, 'name', 'title', 'book_name');
      bookDescription = getString(raw, 'description', 'desc', 'about');
    } else if (raw.character_book || raw.characterBook) {
      // TavernAI character book format
      const book = raw.character_book || raw.characterBook;
      const entries = getArray(book, 'entries', 'items');
      entryIds = parseEntries(entries);
      bookName = getString(book, 'name', 'title');
      bookDescription = getString(book, 'description', 'desc');
    } else if (raw.worldInfo) {
      // World Info format
      const entries = getArray(raw.worldInfo, 'entries', 'items');
      entryIds = parseEntries(entries);
      bookName = getString(raw, 'name', 'title', 'worldName');
      bookDescription = getString(raw, 'description', 'desc');
    } else if (Array.isArray(raw)) {
      // Array of entries directly
      entryIds = parseEntries(raw);
      bookName = 'Imported Lorebook';
      bookDescription = '';
    } else {
      // Try to find any entries-like structure
      const possibleEntries = Object.values(raw).find(val => Array.isArray(val));
      if (possibleEntries && Array.isArray(possibleEntries)) {
        entryIds = parseEntries(possibleEntries);
      }
      bookName = getString(raw, 'name', 'title') || 'Imported Lorebook';
      bookDescription = getString(raw, 'description', 'desc');
    }
    
    // Create the lorebook
    const lorebook: Lorebook = {
      id: generateId(),
      name: bookName || 'Imported Lorebook',
      description: bookDescription || 'Imported from external format',
      entries: entryIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    return lorebook;
  } catch (error) {
    console.error('Failed to import lorebook:', error);
    throw new Error('Invalid lorebook JSON format. Please check the file and try again.');
  }
}

export function exportLoreEntry(entry: LoreEntry): string {
  return JSON.stringify(entry, null, 2);
}

/**
 * Universal lore entry import
 */
export function importLoreEntry(jsonString: string): LoreEntry {
  try {
    const raw = JSON.parse(jsonString);
    
    const getString = (obj: any, ...keys: string[]): string => {
      for (const key of keys) {
        if (obj[key] && typeof obj[key] === 'string') {
          return obj[key].trim();
        }
      }
      return '';
    };
    
    const entry: LoreEntry = {
      id: generateId(),
      name: getString(raw, 'name', 'key', 'title', 'keyword') || 'Entry',
      content: getString(raw, 'content', 'text', 'value', 'description', 'entry'),
      keys: Array.isArray(raw.keys) ? raw.keys : 
            Array.isArray(raw.keywords) ? raw.keywords :
            Array.isArray(raw.triggers) ? raw.triggers :
            raw.key ? [raw.key] : [],
      category: raw.category || 'other',
      importance: typeof raw.importance === 'number' ? raw.importance :
                 typeof raw.priority === 'number' ? raw.priority :
                 typeof raw.weight === 'number' ? raw.weight : 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    return entry;
  } catch (error) {
    console.error('Failed to import lore entry:', error);
    throw new Error('Invalid lore entry JSON format. Please check the file and try again.');
  }
}
