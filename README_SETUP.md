# Ooda Muse Engine

An advanced AI-powered roleplay platform featuring immersive character-driven narrative simulation, dynamic lore management, and multi-model support.

## 🌟 Features

- **Advanced Roleplay Engine**: Immersive, continuous character-driven narrative simulation with action continuity and scene state management
- **Character Gallery**: Create, manage, and interact with custom AI characters
- **Lore World System**: Build rich worldbuilding with lorebooks, entries, and dynamic context injection
- **Multi-Model Support**: Compatible with xAI (Grok) and OpenRouter models (Claude, GPT-4, Gemini, Llama, Mistral)
- **Model Tester**: Compare up to 5 models side-by-side for roleplay quality
- **Character Memory System**: Advanced brain with recent responses, memory bank summaries, and overview memory
- **Media Gallery**: Upload and manage images/videos for characters
- **Share Profiles**: Export and share character profiles via URL

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/oodaverse/Ooda-Muse-Engine.git
cd Ooda-Muse-Engine

# Install dependencies
npm install

# Create .env.local file (optional)
echo "VITE_XAI_API_KEY=your-xai-api-key-here" > .env.local
echo "VITE_OPENROUTER_API_KEY=your-openrouter-api-key-here" >> .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3008`

### Building for Production

```bash
npm run build
npm run preview
```

## 🔑 API Keys

The app supports two AI providers:

### xAI (Grok)
1. Get your API key from [x.ai](https://x.ai)
2. Add to Settings or set `VITE_XAI_API_KEY` environment variable

### OpenRouter
1. Get your API key from [OpenRouter](https://openrouter.ai)
2. Add to Settings or set `VITE_OPENROUTER_API_KEY` environment variable

## 📚 Core Architecture

### Roleplay Engine
Located in `services/roleplay/`, the engine provides:
- **Action Ledger**: Tracks and resolves user actions across turns
- **Scene State Manager**: Maintains persistent world state
- **Response Validator**: Ensures narrative quality and consistency
- **Prompt Layer Manager**: Builds comprehensive system prompts from multiple sources
- **Memory System**: Character brain with recent responses and summarization

### Prompts System
The `prompts.txt` file contains three layered prompts:
1. **System Prompt**: Narrative rules and continuity
2. **Developer Prompt**: Content style and eroticism guidelines
3. **Scene/Context Prompt**: Dynamic state tracking

### Data Storage
- Uses IndexedDB for client-side persistence
- Characters, lorebooks, chat nodes, and gallery items stored locally
- Import/export functionality for data portability

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Storage**: IndexedDB (via idb)
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React
- **Media**: Plyr

## 📁 Project Structure

```
├── components/           # React components
│   ├── CharacterChat.tsx    # Main chat interface
│   ├── CharacterGallery.tsx # Character browser
│   ├── LoreWorld.tsx        # Lorebook management
│   ├── ModelTester.tsx      # Model comparison tool
│   └── Settings.tsx         # App configuration
├── services/            # Core services
│   ├── roleplay/           # Roleplay engine modules
│   ├── storage.ts          # IndexedDB interface
│   ├── xaiService.ts       # AI provider integration
│   └── galleryDB.ts        # Media storage
├── constants.ts         # App constants and models
├── types.ts            # TypeScript interfaces
└── prompts.txt         # Roleplay prompt templates
```

## 🎮 Usage

### Creating a Character
1. Navigate to Characters tab
2. Click "Create Character"
3. Fill in name, personality, scenario, and first message
4. Optionally attach lorebooks for context

### Starting a Conversation
1. Select a character from the gallery
2. The first message will appear automatically
3. Type your message and press Send
4. The AI will respond in character with full context

### Using Lorebooks
1. Go to LoreWorld tab
2. Create a new lorebook
3. Add entries (characters, locations, events, etc.)
4. Attach lorebook to characters for automatic context injection

### Testing Models
1. Go to Settings > Model Tester
2. Select up to 5 models to compare
3. Enter a test prompt
4. Compare responses side-by-side

## 🔒 Privacy

All data is stored locally in your browser's IndexedDB. No data is sent to external servers except API calls to your configured AI provider.

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 🙏 Credits

Built with xAI's Grok API and OpenRouter for multi-model access.

---

**Repository**: [github.com/oodaverse/Ooda-Muse-Engine](https://github.com/oodaverse/Ooda-Muse-Engine)
**Email**: oodaverse@gmail.com
