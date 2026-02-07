import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Plus, Trash2, BookOpen, Settings as SettingsIcon, Image as ImageIcon, Library, Edit2, Copy, Download, FileText, Share2, Archive, RefreshCw, X, ChevronDown } from 'lucide-react';
import { Character, ChatNode, Message, Role, ViewType, LoreEntry, Lorebook, GalleryItem, CharacterBrain, CharacterMemoryChunk, CharacterMemorySummary, AIModel } from '../types';
import { getCharacter, getNodesForCharacter, saveNode, deleteNode, generateId, getNode, getLoreEntries, getLorebooks, getSettings, exportCharacterHTML, saveCharacter } from '../services/storage';
import { sendMessageToCharacter, sendMessageWithCustomPrompt, sendMessageWithModel, summarizeResponsesToMemory, summarizeMemoryBankOverview } from '../services/xaiService';
import { useRoleplayEngine, getLoreContextForCharacter } from '../services/roleplay';
import { getGalleryItemsByCharacter, saveGalleryItem, createThumbnail } from '../services/galleryDB';
import { NSFW_ROLEPLAY_MODELS } from '../constants';
import { OracleViewer } from './OracleViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CharacterChatProps {
  characterId: string;
  nodeId?: string;
  onNavigate: (view: ViewType, id?: string) => void;
}

export const CharacterChat: React.FC<CharacterChatProps> = ({ characterId, nodeId, onNavigate }) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [nodes, setNodes] = useState<ChatNode[]>([]);
  const [activeNode, setActiveNode] = useState<ChatNode | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showLoreDex, setShowLoreDex] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [activeLoreCount, setActiveLoreCount] = useState(0);
  const [loreDexSearch, setLoreDexSearch] = useState('');
  const [loreDexCategory, setLoreDexCategory] = useState<string>('all');
  const [expandedLoreEntry, setExpandedLoreEntry] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeTitle, setEditingNodeTitle] = useState('');
  // Regenerate with model selection state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateMessageIndex, setRegenerateMessageIndex] = useState<number | null>(null);
  const [selectedRegenerateModel, setSelectedRegenerateModel] = useState<AIModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInitLoreCodex = useRef(false);

  // Roleplay Engine Hook - provides layered prompts, action tracking, scene state
  const roleplayEngine = useRoleplayEngine(characterId);

  const ensureBrain = (char: Character): CharacterBrain => {
    if (char.brain) return char.brain;
    return {
      recentResponses: [],
      memoryBank: [],
      overviewMemory: '',
      updatedAt: Date.now()
    };
  };

  const buildResponseChunks = (messages: Message[], characterName: string): string[] => {
    const chunks: string[] = [];
    let lastUser: Message | null = null;

    messages.forEach((msg) => {
      if (msg.role === Role.User) {
        lastUser = msg;
      } else if (msg.role === Role.Assistant) {
        const userText = lastUser?.content ? `User: ${lastUser.content}` : 'User: (no prior user message)';
        const assistantText = `${characterName}: ${msg.content}`;
        chunks.push(`${userText}\n${assistantText}`);
        lastUser = null;
      }
    });

    return chunks;
  };

  useEffect(() => {
    const char = getCharacter(characterId);
    if (char) {
      setCharacter(char);
      // Initialize roleplay engine for this character
      roleplayEngine.initializeEngine(char);
      
      const charNodes = getNodesForCharacter(characterId);
      setNodes(charNodes);

      if (nodeId) {
        const node = getNode(nodeId);
        if (node) setActiveNode(node);
      } else if (charNodes.length === 0) {
        // Create initial node with first message
        const newNode: ChatNode = {
          id: generateId(),
          characterId,
          title: 'New Conversation',
          messages: char.first_mes ? [{
            id: generateId(),
            role: Role.Assistant,
            content: char.first_mes,
            timestamp: Date.now(),
            characterId
          }] : [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveNode(newNode);
        setActiveNode(newNode);
        setNodes([newNode]);
      } else {
        setActiveNode(charNodes[0]);
      }
    }
  }, [characterId, nodeId]);

  useEffect(() => {
    if (didInitLoreCodex.current) return;
    if (character?.attachedLorebooks && character.attachedLorebooks.length > 0) {
      setShowLoreDex(true);
      didInitLoreCodex.current = true;
    }
  }, [character?.attachedLorebooks]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNode?.messages]);

  useEffect(() => {
    const loadGallery = async () => {
      const items = await getGalleryItemsByCharacter(characterId);
      setGalleryItems(items);
    };
    loadGallery();
    
    // Calculate active lore count
    const char = getCharacter(characterId);
    if (char && char.attachedLorebooks) {
      const lorebooks = getLorebooks();
      const loreEntries = getLoreEntries();
      let count = 0;
      char.attachedLorebooks.forEach(lorebookId => {
        const lorebook = lorebooks.find(b => b.id === lorebookId);
        if (lorebook) {
          lorebook.entries.forEach(entryId => {
            const entry = loreEntries.find(e => e.id === entryId);
            if (entry) count++;
          });
        }
      });
      setActiveLoreCount(count);
    }
  }, [characterId]);

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
        if (!type) continue;
        const thumbnail = await createThumbnail(file);
        await saveGalleryItem({
          type,
          name: file.name,
          blob: file,
          characterId,
          tags: [],
          thumbnail,
        });
      }
      const items = await getGalleryItemsByCharacter(characterId);
      setGalleryItems(items);
      if (items.length > 0) {
        const newest = [...items].sort((a, b) => b.createdAt - a.createdAt)[0];
        setViewingItem(newest);
      }
    } catch (error) {
      console.error('Failed to upload media:', error);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !character || !activeNode || isLoading || activeNode.isClosed) return;

    const userMessage: Message = {
      id: generateId(),
      role: Role.User,
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeNode.messages, userMessage];
    const updatedNode = { ...activeNode, messages: updatedMessages, updatedAt: Date.now() };
    saveNode(updatedNode);
    setActiveNode(updatedNode);
    setInput('');
    setIsLoading(true);

    try {
      // Get lore context using the roleplay engine helper
      const loreContext = getLoreContextForCharacter(character);

      // Build enhanced system prompt using the roleplay engine
      // This includes: System Prompt (narrative rules), Developer Prompt (content style),
      // Scene Prompt (dynamic state), Action Ledger (unresolved actions), and User Model
      const enhancedSystemPrompt = roleplayEngine.buildFullSystemPrompt(character, loreContext);
      
      // Prepare the turn (parses user message for actions, updates scene state)
      roleplayEngine.prepareMessage(userMessage.content);

      // Send message with the enhanced roleplay engine prompt
      const response = await sendMessageWithCustomPrompt(
        enhancedSystemPrompt,
        updatedMessages,
        userMessage.content
      );

      // Process the response through the roleplay engine
      // This validates the response, resolves actions, and updates scene state
      const turnResult = roleplayEngine.processResponse(response, userMessage.content);
      
      // Log validation issues for debugging (can be removed in production)
      if (!turnResult.validation.valid) {
        console.warn('Response validation issues:', turnResult.validation.issues);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: Role.Assistant,
        content: response,
        timestamp: Date.now(),
        characterId: character.id
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalNode = { 
        ...updatedNode, 
        messages: finalMessages, 
        updatedAt: Date.now(),
        title: updatedMessages.length === 1 ? userMessage.content.slice(0, 30) : updatedNode.title
      };
      saveNode(finalNode);
      setActiveNode(finalNode);
      setNodes(getNodesForCharacter(characterId));
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to send message. Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditNode = (node: ChatNode) => {
    setEditingNodeId(node.id);
    setEditingNodeTitle(node.title);
  };

  const handleSaveNodeTitle = (node: ChatNode) => {
    const nextTitle = editingNodeTitle.trim();
    if (!nextTitle) {
      setEditingNodeId(null);
      setEditingNodeTitle('');
      return;
    }
    const updatedNode = { ...node, title: nextTitle, updatedAt: Date.now() };
    saveNode(updatedNode);
    setNodes((prev) => prev.map((n) => (n.id === node.id ? updatedNode : n)));
    if (activeNode?.id === node.id) {
      setActiveNode(updatedNode);
    }
    setEditingNodeId(null);
    setEditingNodeTitle('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeNode || !confirm('Delete this message?')) return;
    
    const updatedMessages = activeNode.messages.filter(msg => msg.id !== messageId);
    const updatedNode = { ...activeNode, messages: updatedMessages, updatedAt: Date.now() };
    saveNode(updatedNode);
    setActiveNode(updatedNode);
    setNodes(getNodesForCharacter(characterId));
  };

  const handleEditMessage = (messageId: string) => {
    const message = activeNode?.messages.find(msg => msg.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingContent(message.content);
    }
  };

  const handleSaveEdit = (messageId: string) => {
    if (!activeNode || !editingContent.trim()) return;
    
    const updatedMessages = activeNode.messages.map(msg => 
      msg.id === messageId ? { ...msg, content: editingContent.trim() } : msg
    );
    const updatedNode = { ...activeNode, messages: updatedMessages, updatedAt: Date.now() };
    saveNode(updatedNode);
    setActiveNode(updatedNode);
    setNodes(getNodesForCharacter(characterId));
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Optional: show a toast notification
  };

  // Open regenerate modal with model selection
  const openRegenerateModal = (messageIndex: number) => {
    setRegenerateMessageIndex(messageIndex);
    setSelectedRegenerateModel(null);
    setShowRegenerateModal(true);
  };

  // Regenerate using the default model (quick regenerate)
  const handleRegenerateResponse = async (messageIndex: number) => {
    if (!activeNode || !character || isLoading || messageIndex === 0) return;
    
    // Get the user message before this assistant message
    const previousUserMessage = activeNode.messages[messageIndex - 1];
    if (!previousUserMessage || previousUserMessage.role !== Role.User) return;
    
    setIsLoading(true);
    
    try {
      // Get history up to (but not including) this assistant message
      const historyMessages = activeNode.messages.slice(0, messageIndex);
      
      // Get lore context using the roleplay engine helper
      const loreContext = getLoreContextForCharacter(character);
      
      // Build enhanced system prompt using the roleplay engine
      const enhancedSystemPrompt = roleplayEngine.buildFullSystemPrompt(character, loreContext);
      
      // Prepare the turn (this re-parses the user message for actions)
      roleplayEngine.prepareMessage(previousUserMessage.content);
      
      // Generate new response with enhanced prompt
      const response = await sendMessageWithCustomPrompt(
        enhancedSystemPrompt,
        historyMessages,
        previousUserMessage.content
      );
      
      // Process response through roleplay engine
      const turnResult = roleplayEngine.processResponse(response, previousUserMessage.content);
      
      if (!turnResult.validation.valid) {
        console.warn('Regenerated response validation issues:', turnResult.validation.issues);
      }
      
      // Replace the message at this index with new response
      const newMessage: Message = {
        id: generateId(),
        role: Role.Assistant,
        content: response,
        timestamp: Date.now(),
        characterId: character.id
      };
      
      const updatedMessages = [
        ...activeNode.messages.slice(0, messageIndex),
        newMessage,
        ...activeNode.messages.slice(messageIndex + 1)
      ];
      
      const updatedNode = { ...activeNode, messages: updatedMessages, updatedAt: Date.now() };
      saveNode(updatedNode);
      setActiveNode(updatedNode);
      setNodes(getNodesForCharacter(characterId));
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to regenerate response.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate using a specific model selected from modal
  const handleRegenerateWithModel = async () => {
    if (!activeNode || !character || isLoading || regenerateMessageIndex === null) return;
    if (!selectedRegenerateModel) {
      // Use default regenerate
      handleRegenerateResponse(regenerateMessageIndex);
      setShowRegenerateModal(false);
      return;
    }
    
    const messageIndex = regenerateMessageIndex;
    const previousUserMessage = activeNode.messages[messageIndex - 1];
    if (!previousUserMessage || previousUserMessage.role !== Role.User) return;
    
    setIsLoading(true);
    setShowRegenerateModal(false);
    
    try {
      // Get history up to (but not including) this assistant message
      const historyMessages = activeNode.messages.slice(0, messageIndex);
      
      // Get lore context and build enhanced system prompt
      const loreContext = getLoreContextForCharacter(character);
      const enhancedSystemPrompt = roleplayEngine.buildFullSystemPrompt(character, loreContext);
      
      // Prepare the turn
      roleplayEngine.prepareMessage(previousUserMessage.content);
      
      // Generate response using the selected model
      const response = await sendMessageWithModel(
        selectedRegenerateModel.id,
        selectedRegenerateModel.provider,
        enhancedSystemPrompt,
        historyMessages,
        previousUserMessage.content
      );
      
      // Process response through roleplay engine
      const turnResult = roleplayEngine.processResponse(response, previousUserMessage.content);
      
      if (!turnResult.validation.valid) {
        console.warn('Regenerated response validation issues:', turnResult.validation.issues);
      }
      
      // Replace the message at this index with new response
      const newMessage: Message = {
        id: generateId(),
        role: Role.Assistant,
        content: response,
        timestamp: Date.now(),
        characterId: character.id
      };
      
      const updatedMessages = [
        ...activeNode.messages.slice(0, messageIndex),
        newMessage,
        ...activeNode.messages.slice(messageIndex + 1)
      ];
      
      const updatedNode = { 
        ...activeNode, 
        messages: updatedMessages, 
        updatedAt: Date.now(),
        model: selectedRegenerateModel.id // Track which model was used
      };
      saveNode(updatedNode);
      setActiveNode(updatedNode);
      setNodes(getNodesForCharacter(characterId));
    } catch (error) {
      console.error('Failed to regenerate with model:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to regenerate response.'}`);
    } finally {
      setIsLoading(false);
      setSelectedRegenerateModel(null);
      setRegenerateMessageIndex(null);
    }
  };

  const handleNewNode = () => {
    if (!character) return;
    const newNode: ChatNode = {
      id: generateId(),
      characterId,
      title: 'New Conversation',
      messages: character.first_mes ? [{
        id: generateId(),
        role: Role.Assistant,
        content: character.first_mes,
        timestamp: Date.now(),
        characterId
      }] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isClosed: false,
    };
    saveNode(newNode);
    setActiveNode(newNode);
    setNodes(getNodesForCharacter(characterId));
  };

  const handleCompileConversation = async () => {
    if (!character || !activeNode || isLoading) return;
    if (activeNode.isClosed) return;

    const confirmed = confirm('Compile this conversation into memory? This will close the chat but keep logs available.');
    if (!confirmed) return;

    const responseChunks = buildResponseChunks(activeNode.messages, character.name);
    if (responseChunks.length === 0) {
      alert('No assistant responses found to compile.');
      return;
    }

    setIsLoading(true);
    try {
      const brain = ensureBrain(character);

      const newChunks: CharacterMemoryChunk[] = responseChunks.map((content) => ({
        id: generateId(),
        createdAt: Date.now(),
        content
      }));

      const recentResponses = [...brain.recentResponses, ...newChunks];
      const memoryBank: CharacterMemorySummary[] = [...brain.memoryBank];

      // Compile every 25 response chunks into a memory bank summary
      while (recentResponses.length >= 25) {
        const batch = recentResponses.splice(0, 25);
        const summary = await summarizeResponsesToMemory(character.name, batch.map((b) => b.content));
        memoryBank.push({
          id: generateId(),
          createdAt: Date.now(),
          content: summary,
          sourceCount: batch.length
        });
      }

      let overviewMemory = brain.overviewMemory || '';
      if (memoryBank.length >= 25) {
        overviewMemory = await summarizeMemoryBankOverview(
          character.name,
          memoryBank.map((m) => m.content)
        );
      }

      const updatedBrain: CharacterBrain = {
        recentResponses,
        memoryBank,
        overviewMemory,
        updatedAt: Date.now()
      };

      const updatedCharacter: Character = { ...character, brain: updatedBrain, updatedAt: Date.now() };
      saveCharacter(updatedCharacter);
      setCharacter(updatedCharacter);

      const compiledNode: ChatNode = {
        ...activeNode,
        isClosed: true,
        compiledAt: Date.now(),
        updatedAt: Date.now()
      };
      saveNode(compiledNode);
      setActiveNode(compiledNode);
      setNodes(getNodesForCharacter(characterId));

      alert('Conversation compiled into memory and archived.');
    } catch (error) {
      console.error('Failed to compile memory:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to compile memory.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNode = (id: string) => {
    if (confirm('Delete this conversation?')) {
      deleteNode(id);
      const remainingNodes = getNodesForCharacter(characterId);
      setNodes(remainingNodes);
      if (activeNode?.id === id) {
        setActiveNode(remainingNodes[0] || null);
      }
    }
  };

  const handleExportHTML = async () => {
    if (!character) return;
    try {
      const html = await exportCharacterHTML(character, galleryItems, nodes);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character.name.replace(/\s+/g, '_')}_profile.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export HTML:', err);
      alert('Failed to export HTML profile.');
    }
  };

  const handleShareHTML = async () => {
    if (!character) return;
    try {
      const shareData = {
        character,
        gallery: galleryItems,
        nodes: nodes
      };
      
      const jsonStr = JSON.stringify(shareData);
      const encoded = btoa(encodeURIComponent(jsonStr));
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/share/${character.id}?data=${encoded}`;
      
      await navigator.clipboard.writeText(shareUrl);
      window.open(shareUrl, '_blank');
      
      alert('✅ Shareable link copied to clipboard and opened!');
    } catch (err) {
      console.error('Failed to share:', err);
      alert('Failed to generate shareable link.');
    }
  };

  if (!character) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Character not found</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate(ViewType.Characters)}
              className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            {character.avatar && (
              <img src={character.avatar} alt={character.name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{character.name}</h1>
              <p className="text-sm text-slate-400">{activeNode?.title || 'Chat'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {character.attachedLorebooks && character.attachedLorebooks.length > 0 && (
              <>
                <button
                  onClick={() => setShowLorebooks(!showLorebooks)}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/50 text-blue-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl"
                  title={`${character.attachedLorebooks.length} lorebook(s) attached with ${activeLoreCount} total entries`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-medium">{activeLoreCount} lore</span>
                </button>
                <button
                  onClick={() => setShowLoreDex(!showLoreDex)}
                  className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl"
                  title="Lore Codex - Browse Active Lore Entries"
                >
                  <Library className="w-4 h-4" />
                  Lore Codex
                </button>
              </>
            )}
            <button
              onClick={() => setShowGallery(!showGallery)}
              className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl"
            >
              <ImageIcon className="w-4 h-4" />
              {galleryItems.length}
            </button>
            <button
              onClick={handleNewNode}
              className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
            <button
              onClick={handleCompileConversation}
              disabled={!activeNode || activeNode.isClosed || isLoading}
              className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
              title="Compile this conversation into memory and archive it"
            >
              <Archive className="w-4 h-4" />
              Compile
            </button>
            <button
              onClick={handleExportHTML}
              className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 rounded-xl transition-all backdrop-blur-xl"
              title="Export as interactive HTML profile"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleShareHTML}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 rounded-xl transition-all backdrop-blur-xl"
              title="Share profile (opens in new tab)"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation Nodes */}
        <div className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 overflow-y-auto">
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Conversations</h3>
            {nodes.map(node => (
              <div
                key={node.id}
                onClick={() => setActiveNode(node)}
                className={`p-3 rounded-xl cursor-pointer transition-all group ${
                  activeNode?.id === node.id
                    ? 'bg-cyan-600/20 border border-cyan-500/50 backdrop-blur-xl'
                    : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent backdrop-blur-xl'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingNodeId === node.id ? (
                      <input
                        value={editingNodeTitle}
                        onChange={(e) => setEditingNodeTitle(e.target.value)}
                        onBlur={() => handleSaveNodeTitle(node)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveNodeTitle(node);
                          } else if (e.key === 'Escape') {
                            setEditingNodeId(null);
                            setEditingNodeTitle('');
                          }
                        }}
                        autoFocus
                        className="w-full px-2 py-1 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    ) : (
                      <p className="text-sm font-medium text-white truncate">{node.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-400">{node.messages.length} messages</p>
                      {node.isClosed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditNode(node);
                    }}
                    className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    Rename
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeNode?.messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 group ${message.role === Role.User ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === Role.Assistant && character.avatar && (
                  <img src={character.avatar} alt={character.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                )}
                <div className="flex flex-col gap-2 max-w-[70%]">
                  <div
                    className={`rounded-xl p-4 backdrop-blur-xl ${
                      message.role === Role.User
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-100'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white resize-none"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(message.id)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        className="prose prose-invert prose-sm max-w-none"
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold text-white mb-5 mt-8 pb-2.5 border-b-2 border-slate-700/50 first:mt-0">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-bold text-white mb-4 mt-8 flex items-center gap-2 first:mt-0"><span className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full"></span>{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-semibold text-slate-100 mb-3 mt-6 first:mt-0">{children}</h3>,
                          h4: ({children}) => <h4 className="text-sm font-semibold text-slate-200 mb-2.5 mt-5 first:mt-0">{children}</h4>,
                          p: ({children}) => <p className="leading-[1.75] mb-5 text-slate-300 text-sm last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-outside ml-4 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-outside ml-4 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ol>,
                          li: ({children}) => <li className="pl-1 leading-[1.65]">{children}</li>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-cyan-600/50 pl-4 py-2.5 my-5 italic text-slate-400 bg-slate-900/40 rounded-r-lg">{children}</blockquote>,
                          a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 hover:decoration-cyan-300/50 underline-offset-2 transition-colors">{children}</a>,
                          hr: () => <hr className="border-slate-700 my-8" />,
                          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({children}) => <em className="italic text-slate-200">{children}</em>,
                          code: ({inline, children}: any) => inline ? <code className="bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/50">{children}</code> : <code>{children}</code>
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  {/* Message actions - show on hover */}
                  {editingMessageId !== message.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyMessage(message.content)}
                        className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleEditMessage(message.id)}
                        className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors"
                        title="Edit message"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {message.role === Role.Assistant && index > 0 && (
                        <>
                          {/* Quick regenerate with default model */}
                          <button
                            onClick={() => handleRegenerateResponse(index)}
                            disabled={isLoading}
                            className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                            title="Quick Regenerate (default model)"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          {/* Regenerate with model selection */}
                          <button
                            onClick={() => openRegenerateModal(index)}
                            disabled={isLoading}
                            className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                            title="Regenerate with model selection"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 hover:bg-red-600/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                {character.avatar && (
                  <img src={character.avatar} alt={character.name} className="w-8 h-8 rounded-full object-cover" />
                )}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700/50 p-4 bg-slate-900/90 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={activeNode?.isClosed ? 'This conversation is archived. Start a new one to continue.' : `Message ${character.name}... (Shift+Enter for new line)`}
                disabled={isLoading || activeNode?.isClosed}
                rows={1}
                className="flex-1 px-4 py-3 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 resize-none overflow-y-auto max-h-40"
                style={{ minHeight: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim() || activeNode?.isClosed}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lorebook Sidebar */}
      {showLorebooks && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 overflow-y-auto z-40">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Lore Context
              </h3>
              <button
                onClick={() => setShowLorebooks(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {character.attachedLorebooks?.map(lorebookId => {
                const lorebook = getLorebooks().find(b => b.id === lorebookId);
                if (!lorebook) return null;
                return (
                  <div key={lorebookId} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3">
                    <h4 className="font-semibold text-white mb-2">{lorebook.name}</h4>
                    <p className="text-xs text-slate-400 mb-2">{lorebook.description}</p>
                    <p className="text-xs text-slate-500">{lorebook.entries.length} entries</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Sidebar */}
      {showGallery && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 overflow-y-auto z-40">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                Gallery
              </h3>
              <button
                onClick={() => setShowGallery(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Upload images or videos to this character.</p>
              <label className="px-3 py-2 rounded-xl text-xs cursor-pointer border backdrop-blur-xl bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 text-white">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleGalleryUpload}
                />
                {isUploading ? 'Uploading…' : 'Upload'}
              </label>
            </div>
            {galleryItems.length === 0 ? (
              <p className="text-slate-400 text-sm">No media files for this character yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galleryItems.map(item => (
                  <GalleryThumb key={item.id} item={item} onClick={() => setViewingItem(item)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lore Codex Sidebar - Enhanced Codex View */}
      {showLoreDex && character.attachedLorebooks && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 flex flex-col z-40">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Library className="w-5 h-5 text-indigo-400" />
                Lore Codex
              </h3>
              <button
                onClick={() => setShowLoreDex(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Search lore entries..."
              value={loreDexSearch}
              onChange={(e) => setLoreDexSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 mb-3"
            />
            <div className="flex gap-1 flex-wrap">
              {['all', 'character', 'location', 'event', 'item', 'concept', 'other'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setLoreDexCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${
                    loreDexCategory === cat
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {character.attachedLorebooks.map(lorebookId => {
              const lorebook = getLorebooks().find(b => b.id === lorebookId);
              if (!lorebook) return null;
              
              let loreEntries = getLoreEntries().filter(e => lorebook.entries.includes(e.id));
              
              // Apply filters
              if (loreDexSearch) {
                const searchLower = loreDexSearch.toLowerCase();
                loreEntries = loreEntries.filter(e => 
                  e.name.toLowerCase().includes(searchLower) ||
                  e.content.toLowerCase().includes(searchLower) ||
                  e.keys.some(k => k.toLowerCase().includes(searchLower))
                );
              }
              if (loreDexCategory !== 'all') {
                loreEntries = loreEntries.filter(e => e.category === loreDexCategory);
              }
              
              // Sort by importance
              loreEntries.sort((a, b) => b.importance - a.importance);
              
              if (loreEntries.length === 0) return null;
              
              return (
                <div key={lorebookId} className="space-y-2">
                  <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 rounded-xl p-3 backdrop-blur-xl">
                    <h4 className="font-semibold text-white text-sm">{lorebook.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{loreEntries.length} entries shown</p>
                  </div>
                  {loreEntries.map(entry => {
                    const isExpanded = expandedLoreEntry === entry.id;
                    const contentPreview = entry.content.length > 150 ? entry.content.slice(0, 150) + '...' : entry.content;
                    
                    return (
                      <div 
                        key={entry.id} 
                        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 hover:border-indigo-500/30 transition-all cursor-pointer"
                        onClick={() => setExpandedLoreEntry(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-white text-sm flex-1">{entry.name}</h5>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <span className="text-xs px-2 py-1 bg-cyan-600/20 text-cyan-300 rounded-lg">
                              {entry.category}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded-lg font-medium">
                              {entry.importance}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {isExpanded ? entry.content : contentPreview}
                        </p>
                        {entry.keys.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.keys.map(key => (
                              <span key={key} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg">
                                {key}
                              </span>
                            ))}
                          </div>
                        )}
                        {!isExpanded && entry.content.length > 150 && (
                          <p className="text-xs text-indigo-400 mt-2">Click to expand...</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Oracle Viewer */}
      {viewingItem && (
        <OracleViewer item={viewingItem} onClose={() => setViewingItem(null)} />
      )}

      {/* Regenerate with Model Selection Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                Regenerate with Different Model
              </h3>
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setSelectedRegenerateModel(null);
                  setRegenerateMessageIndex(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <p className="text-sm text-slate-400 mb-4">
                Select a model to regenerate this response, or use the default model.
              </p>
              
              {/* Model Groups */}
              <div className="space-y-4">
                {/* xAI Models */}
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">xAI Models</h4>
                  <div className="space-y-1">
                    {NSFW_ROLEPLAY_MODELS.filter(m => m.provider === 'xai').map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedRegenerateModel(model)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedRegenerateModel?.id === model.id
                            ? 'bg-cyan-500/20 border border-cyan-500/50'
                            : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">{model.name}</span>
                          {model.isNsfw && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">NSFW</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{model.pricing}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* OpenRouter Models */}
                <div>
                  <h4 className="text-sm font-medium text-purple-400 mb-2">OpenRouter Models</h4>
                  <div className="space-y-1">
                    {NSFW_ROLEPLAY_MODELS.filter(m => m.provider === 'openrouter').slice(0, 15).map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedRegenerateModel(model)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedRegenerateModel?.id === model.id
                            ? 'bg-cyan-500/20 border border-cyan-500/50'
                            : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">{model.name}</span>
                          {model.isNsfw && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">NSFW</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{model.description?.substring(0, 60)}...</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  if (regenerateMessageIndex !== null) {
                    handleRegenerateResponse(regenerateMessageIndex);
                  }
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                Use Default Model
              </button>
              <button
                onClick={handleRegenerateWithModel}
                disabled={!selectedRegenerateModel || isLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface GalleryThumbProps {
  item: GalleryItem;
  onClick: () => void;
}

const GalleryThumb: React.FC<GalleryThumbProps> = ({ item, onClick }) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    let cleanups: Array<() => void> = [];
    if (item.thumbnail) {
      setThumbUrl(item.thumbnail);
    } else if (item.type === 'image' && item.blob) {
      const isBlob = item.blob instanceof Blob;
      const url = isBlob ? URL.createObjectURL(item.blob as Blob) : (item.blob as unknown as string);
      setThumbUrl(url);
      if (isBlob) cleanups.push(() => URL.revokeObjectURL(url));
    }

    if (item.type === 'video' && item.blob) {
      const isBlob = item.blob instanceof Blob;
      const url = isBlob ? URL.createObjectURL(item.blob as Blob) : (item.blob as unknown as string);
      setPreviewUrl(url);
      if (isBlob) cleanups.push(() => URL.revokeObjectURL(url));
    }

    return () => cleanups.forEach(fn => fn());
  }, [item.thumbnail, item.blob, item.type]);

  return (
    <button
      onClick={onClick}
      className="aspect-square bg-slate-800/50 backdrop-blur-xl rounded-xl overflow-hidden hover:ring-2 hover:ring-cyan-500/50 transition-all border border-slate-700/50"
    >
      {item.type === 'video' ? (
        <video
          src={previewUrl}
          poster={thumbUrl || undefined}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : item.type === 'embed' ? (
        <div className="w-full h-full bg-slate-900/50 text-cyan-300 text-xs flex items-center justify-center p-2 text-center">
          Embed
        </div>
      ) : thumbUrl ? (
        <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-600" />
        </div>
      )}
    </button>
  );
};

