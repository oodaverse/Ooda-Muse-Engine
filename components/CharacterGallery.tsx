import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Upload, Download, Trash2, Edit, MessageSquare, BookOpen, FileText, Share2, ChevronDown } from 'lucide-react';
import { Character, ViewType, GalleryItem, Lorebook } from '../types';
import { getCharacters, saveCharacter, deleteCharacter, generateId, exportCharacter, importCharacter, getLorebooks, exportCharacterHTML, getNodesForCharacter } from '../services/storage';
import { getGalleryItemsByCharacter, saveGalleryItem, deleteGalleryItem, updateGalleryItem } from '../services/galleryDB';
import { OracleViewer } from './OracleViewer';

interface CharacterGalleryProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const CharacterGallery: React.FC<CharacterGalleryProps> = ({ onNavigate }) => {
  const [characters, setCharacters] = useState<Character[]>(getCharacters());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setExportMenuOpen(null);
    if (exportMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [exportMenuOpen]);

  const filteredCharacters = characters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCharacter = (character: Partial<Character>) => {
    const newChar: Character = {
      id: generateId(),
      name: character.name || 'New Character',
      description: character.description || '',
      personality: character.personality || '',
      scenario: character.scenario || '',
      first_mes: character.first_mes || '',
      mes_example: character.mes_example || '',
      avatar: character.avatar,
      gallery: character.gallery || [],
      tags: character.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachedLorebooks: character.attachedLorebooks || [],
      data: {},
    };
    saveCharacter(newChar);
    setCharacters(getCharacters());
    setShowCreateModal(false);
  };

  const handleDeleteCharacter = (id: string) => {
    if (confirm('Are you sure you want to delete this character?')) {
      deleteCharacter(id);
      setCharacters(getCharacters());
    }
  };

  const handleExportCharacter = (character: Character) => {
    const json = exportCharacter(character);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const handleExportHTML = async (character: Character) => {
    try {
      const galleryItems = await getGalleryItemsByCharacter(character.id);
      const chatNodes = getNodesForCharacter(character.id);
      const html = await exportCharacterHTML(character, galleryItems, chatNodes);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character.name.replace(/\s+/g, '_')}_profile.html`;
      a.click();
      URL.revokeObjectURL(url);
      alert('✅ Interactive HTML profile exported successfully!');
    } catch (err) {
      console.error('Failed to export HTML:', err);
      alert('Failed to export HTML profile. Please try again.');
    }
  };

  const handleShareHTML = async (character: Character) => {
    try {
      const galleryItems = await getGalleryItemsByCharacter(character.id);
      const chatNodes = getNodesForCharacter(character.id);
      
      // Create shareable data object
      const shareData = {
        character,
        gallery: galleryItems,
        nodes: chatNodes
      };
      
      // Encode to base64
      const jsonStr = JSON.stringify(shareData);
      const encoded = btoa(encodeURIComponent(jsonStr));
      
      // Generate shareable URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/share/${character.id}?data=${encoded}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      // Also open in new tab
      window.open(shareUrl, '_blank');
      
      alert('✅ Shareable link copied to clipboard and opened in new tab!\n\nShare this URL to let others view the full character profile with gallery and conversations.');
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate shareable link. Please try again.');
    }
  };

  const handleImportCharacter = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          // Handle JSON files
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const char = importCharacter(event.target?.result as string);
              saveCharacter(char);
              setCharacters(getCharacters());
              alert(`Successfully imported: ${char.name}`);
            } catch (err) {
              console.error(err);
              alert('Failed to import character. Please check the JSON file format and try again.');
            }
          };
          reader.readAsText(file);
        } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
          // Handle PNG files with embedded JSON (TavernAI/SillyTavern format)
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const arrayBuffer = event.target?.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              
              // Look for tEXt chunk with chara data
              let jsonString = '';
              for (let i = 0; i < uint8Array.length - 4; i++) {
                if (uint8Array[i] === 0x74 && uint8Array[i+1] === 0x45 && 
                    uint8Array[i+2] === 0x58 && uint8Array[i+3] === 0x74) {
                  // Found tEXt chunk, read the keyword
                  const chunkStart = i + 4;
                  let keywordEnd = chunkStart;
                  while (keywordEnd < uint8Array.length && uint8Array[keywordEnd] !== 0) {
                    keywordEnd++;
                  }
                  const keyword = new TextDecoder().decode(uint8Array.slice(chunkStart, keywordEnd));
                  
                  if (keyword === 'chara') {
                    // Found character data
                    const dataStart = keywordEnd + 1;
                    let dataEnd = dataStart;
                    while (dataEnd < uint8Array.length && uint8Array[dataEnd] !== 0) {
                      dataEnd++;
                    }
                    const base64Data = new TextDecoder().decode(uint8Array.slice(dataStart, dataEnd));
                    jsonString = atob(base64Data);
                    break;
                  }
                }
              }
              
              if (jsonString) {
                const char = importCharacter(jsonString);
                saveCharacter(char);
                setCharacters(getCharacters());
                alert(`Successfully imported: ${char.name}`);
              } else {
                alert('No character data found in PNG file. This may not be a character card image.');
              }
            } catch (err) {
              console.error(err);
              alert('Failed to extract character data from PNG. Please check if this is a valid character card image.');
            }
          };
          reader.readAsArrayBuffer(file);
        }
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-cyan-400" />
              Character Gallery
            </h1>
            <p className="text-slate-400 mt-1">{characters.length} characters available</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImportCharacter}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xl shadow-lg shadow-cyan-500/10"
            >
              <Plus className="w-4 h-4" />
              Create Character
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Character Grid */}
        {filteredCharacters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCharacters.map(character => (
              <div
                key={character.id}
                className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
              >
                {/* Avatar */}
                <div 
                  className="relative aspect-square cursor-pointer"
                  onClick={() => onNavigate(ViewType.CharacterDetail, character.id)}
                >
                  {character.avatar ? (
                    <img 
                      src={character.avatar} 
                      alt={character.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-slate-700/30 flex items-center justify-center">
                      <Users className="w-16 h-16 text-slate-500" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {character.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-black/60 backdrop-blur text-slate-300 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg truncate">{character.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2">{character.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onNavigate(ViewType.CharacterDetail, character.id)}
                      className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </button>
                    <button
                      onClick={() => setEditingCharacter(character)}
                      className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 rounded-xl transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportMenuOpen(exportMenuOpen === character.id ? null : character.id);
                        }}
                        className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 rounded-xl transition-all flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {exportMenuOpen === character.id && (
                        <div 
                          className="absolute right-0 mt-1 w-56 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl z-50 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              handleExportCharacter(character);
                              setExportMenuOpen(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 text-slate-200 flex items-center gap-3 transition-colors border-b border-slate-700/50"
                          >
                            <Download className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="text-sm font-medium">Export JSON</div>
                              <div className="text-xs text-slate-500">Raw character data</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              handleExportHTML(character);
                              setExportMenuOpen(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 text-slate-200 flex items-center gap-3 transition-colors border-b border-slate-700/50"
                          >
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <div>
                              <div className="text-sm font-medium">Export HTML</div>
                              <div className="text-xs text-slate-500">Interactive profile</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              handleShareHTML(character);
                              setExportMenuOpen(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 text-slate-200 flex items-center gap-3 transition-colors"
                          >
                            <Share2 className="w-4 h-4 text-blue-400" />
                            <div>
                              <div className="text-sm font-medium">Share Profile</div>
                              <div className="text-xs text-slate-500">Open & copy link</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCharacter(character.id)}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No characters found</h3>
            <p className="text-gray-500">Create your first character to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCharacter) && (
        <CharacterModal
          character={editingCharacter}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCharacter(null);
          }}
          onSave={(char) => {
            if (editingCharacter) {
              saveCharacter({ ...editingCharacter, ...char, updatedAt: Date.now() });
            } else {
              handleCreateCharacter(char);
            }
            setCharacters(getCharacters());
            setShowCreateModal(false);
            setEditingCharacter(null);
          }}
        />
      )}
    </div>
  );
};

// Character Modal Component
interface CharacterModalProps {
  character: Character | null;
  onClose: () => void;
  onSave: (character: Partial<Character>) => void;
}

const CharacterModal: React.FC<CharacterModalProps> = ({ character, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Character>>({
    name: character?.name || '',
    description: character?.description || '',
    personality: character?.personality || '',
    scenario: character?.scenario || '',
    first_mes: character?.first_mes || '',
    mes_example: character?.mes_example || '',
    avatar: character?.avatar || '',
    tags: character?.tags || [],
    attachedLorebooks: character?.attachedLorebooks || [],
  });
  const [media, setMedia] = useState<GalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [embedName, setEmbedName] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    const loadMedia = async () => {
      if (character?.id) {
        const items = await getGalleryItemsByCharacter(character.id);
        setMedia(items);
      } else {
        setMedia([]);
      }
    };
    loadMedia();
  }, [character?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }
    setIsAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setFormData({ ...formData, avatar: reader.result as string });
      setIsAvatarUploading(false);
      e.target.value = '';
    };
    reader.onerror = () => {
      setIsAvatarUploading(false);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !character?.id) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
        if (!type) continue;
        await saveGalleryItem({
          type,
          name: file.name,
          blob: file,
          characterId: character.id,
          tags: [],
          thumbnail: undefined,
        });
      }
      const items = await getGalleryItemsByCharacter(character.id);
      setMedia(items);
    } catch (err) {
      console.error('Failed to upload media', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (id: string) => {
    await deleteGalleryItem(id);
    if (character?.id) {
      const items = await getGalleryItemsByCharacter(character.id);
      setMedia(items);
    }
  };

  const handleRenameMedia = async (id: string, name: string) => {
    await updateGalleryItem(id, { name });
    if (character?.id) {
      const items = await getGalleryItemsByCharacter(character.id);
      setMedia(items);
    }
  };

  const handleAddEmbed = async () => {
    if (!character?.id || !embedName.trim() || !embedCode.trim()) return;
    setIsUploading(true);
    try {
      const urlMatch = embedCode.trim().match(/https?:\/\/\S+/);
      await saveGalleryItem({
        type: 'embed',
        name: embedName.trim(),
        embedCode: embedCode.trim(),
        embedUrl: urlMatch ? urlMatch[0] : undefined,
        characterId: character.id,
        tags: [],
        thumbnail: undefined,
      });
      const items = await getGalleryItemsByCharacter(character.id);
      setMedia(items);
      setEmbedName('');
      setEmbedCode('');
    } catch (err) {
      console.error('Failed to add embed', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-500/10">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {character ? 'Edit Character' : 'Create Character'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="Character name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Avatar URL</label>
            <div className="flex flex-col gap-3">
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="https://... (or upload an image)"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Upload an image to use as the avatar.</p>
                <label className="px-3 py-2 rounded-xl text-xs cursor-pointer border backdrop-blur-xl bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 text-white">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  {isAvatarUploading ? 'Uploading…' : 'Upload Avatar'}
                </label>
              </div>
              {formData.avatar && (
                <div className="flex items-center gap-3">
                  <img
                    src={formData.avatar}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700/50"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: '' })}
                    className="px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-200 rounded-xl"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="Concise bio: appearance, vibe, role (avoid long prose)."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Personality</label>
            <textarea
              rows={3}
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="Use concise bullet-ish traits (tone, style, boundaries)."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Scenario</label>
            <textarea
              rows={3}
              value={formData.scenario}
              onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="Setting + stakes + relationship hooks (short, vivid)."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">First Message</label>
            <textarea
              rows={3}
              value={formData.first_mes}
              onChange={(e) => setFormData({ ...formData, first_mes: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder={`{{char}}: (warm, in-character opener that sets tone and relationship)
{{char}}: I was starting to think you forgot me. Ready to make trouble together?`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Example Messages</label>
            <textarea
              rows={4}
              value={formData.mes_example}
              onChange={(e) => setFormData({ ...formData, mes_example: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder={`<START>
{{user}}: Hey, what's the plan tonight?
{{char}}: Whatever gets our hearts racing—street food first, rooftop after. Stay close.
{{user}}: You always know the best spots.
{{char}}: I know you. Now move—sunset's waiting.`}
            />
          </div>

          <div className="border-t border-slate-700/50 pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Attached Lorebooks</label>
              <p className="text-xs text-slate-500 mb-3">Select lorebooks to inject their lore entries during conversations.</p>
              <div className="space-y-2">
                {getLorebooks().map(book => {
                  const isAttached = (formData.attachedLorebooks || []).includes(book.id);
                  return (
                    <label
                      key={book.id}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-cyan-500/50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={isAttached}
                        onChange={(e) => {
                          const current = formData.attachedLorebooks || [];
                          const updated = e.target.checked
                            ? [...current, book.id]
                            : current.filter(id => id !== book.id);
                          setFormData({ ...formData, attachedLorebooks: updated });
                        }}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-cyan-400" />
                          <span className="text-white font-medium text-sm">{book.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{book.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{book.entries.length} entries</p>
                      </div>
                    </label>
                  );
                })}
                {getLorebooks().length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No lorebooks available. Create one in LoreWorld first.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-300">Character Media</label>
                <p className="text-xs text-slate-500">Upload images/videos directly to this character for quick selection.</p>
              </div>
              <label className={`px-3 py-2 rounded-xl text-sm cursor-pointer border backdrop-blur-xl ${character?.id ? 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 text-white' : 'bg-slate-800/30 border-slate-700/50 text-slate-500 cursor-not-allowed'}`}>
                <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={!character?.id || isUploading} onChange={handleMediaUpload} />
                {isUploading ? 'Uploading…' : 'Upload'}
              </label>
            </div>

            {!character?.id && (
              <p className="text-xs text-slate-500">Save the character first to enable media uploads.</p>
            )}

            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {media.map(item => (
                  <CharacterMediaThumb
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteMedia}
                    onRename={handleRenameMedia}
                    onView={() => setViewingItem(item)}
                  />
                ))}
              </div>
            ) : character?.id ? (
              <p className="text-xs text-gray-500">No media yet. Upload images, clips, or embeds.</p>
            ) : null}
          </div>

          <div className="border-t border-slate-700/50 pt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-300">Add Embedded Code</label>
            <p className="text-xs text-slate-500">Paste iframe/embed HTML or a media URL to save as reusable embed.</p>
            <input
              type="text"
              value={embedName}
              onChange={(e) => setEmbedName(e.target.value)}
              placeholder="Title for this embed"
              className="w-full px-3 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
            <textarea
              rows={3}
              value={embedCode}
              onChange={(e) => setEmbedCode(e.target.value)}
              placeholder="<iframe ...></iframe> or https://media-url"
              className="w-full px-3 py-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddEmbed}
                disabled={!character?.id || isUploading || !embedName.trim() || !embedCode.trim()}
                className="px-4 py-2 bg-cyan-600/50 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-500/50 disabled:opacity-50 text-white rounded-xl text-sm transition-colors"
              >
                Save Embed
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-cyan-500/20"
            >
              {character ? 'Save Changes' : 'Create Character'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-white rounded-xl font-semibold transition-colors backdrop-blur-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {viewingItem && (
        <OracleViewer item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
    </div>
  );
};

interface CharacterMediaThumbProps {
  item: GalleryItem;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onView: () => void;
}

const CharacterMediaThumb: React.FC<CharacterMediaThumbProps> = ({ item, onDelete, onRename, onView }) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [name, setName] = useState(item.name);

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  useEffect(() => {
    let cleanups: Array<() => void> = [];
    if (item.thumbnail) {
      setThumbUrl(item.thumbnail);
    } else if (item.type === 'image') {
      const isBlob = item.blob instanceof Blob;
      const url = isBlob ? URL.createObjectURL(item.blob) : (item.blob as unknown as string);
      setThumbUrl(url);
      if (isBlob) cleanups.push(() => URL.revokeObjectURL(url));
    }

    if (item.type === 'video') {
      const isBlob = item.blob instanceof Blob;
      const url = isBlob ? URL.createObjectURL(item.blob) : (item.blob as unknown as string);
      setPreviewUrl(url);
      if (isBlob) cleanups.push(() => URL.revokeObjectURL(url));
    }

    return () => cleanups.forEach(fn => fn());
  }, [item.thumbnail, item.blob, item.type]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl overflow-hidden border border-slate-700/50 flex flex-col hover:border-cyan-500/30 transition-colors">
      <button
        type="button"
        onClick={onView}
        className="aspect-square relative text-left"
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
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">No preview</div>
        )}
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item.id);
          }}
          className="absolute top-2 right-2 p-1 bg-red-500/80 backdrop-blur-xl hover:bg-red-500 text-white rounded-lg shadow-lg"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && onRename(item.id, name.trim())}
        className="px-2 py-1 bg-slate-900/50 border-t border-slate-700/50 text-white text-xs focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
};
