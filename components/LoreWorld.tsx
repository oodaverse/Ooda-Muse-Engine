import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Save, Sparkles, Library, Upload, Download } from 'lucide-react';
import { Lorebook, LoreEntry, ViewType } from '../types';
import { getLorebooks, saveLorebook, deleteLorebook, getLoreEntries, saveLoreEntry, deleteLoreEntry, generateId, importLorebook, exportLorebook, importLoreEntry, exportLoreEntry } from '../services/storage';
import { LoreAIBuilder } from './LoreAIBuilder';

interface LoreWorldProps {
  onNavigate: (view: ViewType) => void;
}

export const LoreWorld: React.FC<LoreWorldProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'builder'>('library');
  const [lorebooks, setLorebooks] = useState<Lorebook[]>(getLorebooks());
  const [selectedLorebook, setSelectedLorebook] = useState<Lorebook | null>(null);
  const [entries, setEntries] = useState<LoreEntry[]>(getLoreEntries());
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh entries and lorebooks when switching tabs or when refresh is triggered
  useEffect(() => {
    const updatedLorebooks = getLorebooks();
    const updatedEntries = getLoreEntries();
    setLorebooks(updatedLorebooks);
    setEntries(updatedEntries);
    
    // Update selected lorebook if it exists
    if (selectedLorebook) {
      const updated = updatedLorebooks.find(b => b.id === selectedLorebook.id);
      if (updated) setSelectedLorebook(updated);
    }
  }, [activeTab, refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleCreateLorebook = (name: string, description: string) => {
    const newBook: Lorebook = {
      id: generateId(),
      name,
      description,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveLorebook(newBook);
    setLorebooks(getLorebooks());
    setShowCreateBook(false);
  };

  const handleDeleteLorebook = (id: string) => {
    if (confirm('Delete this lorebook?')) {
      deleteLorebook(id);
      setLorebooks(getLorebooks());
      if (selectedLorebook?.id === id) setSelectedLorebook(null);
    }
  };

  const handleCreateEntry = (entry: Partial<LoreEntry>) => {
    if (!selectedLorebook) return;
    const newEntry: LoreEntry = {
      id: generateId(),
      name: entry.name || 'New Entry',
      content: entry.content || '',
      keys: entry.keys || [],
      category: entry.category || 'other',
      importance: entry.importance || 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveLoreEntry(newEntry);
    
    const updatedBook = {
      ...selectedLorebook,
      entries: [...selectedLorebook.entries, newEntry.id],
    };
    saveLorebook(updatedBook);
    setEntries(getLoreEntries());
    setLorebooks(getLorebooks());
    setSelectedLorebook(updatedBook);
    setShowCreateEntry(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Delete this entry?')) {
      deleteLoreEntry(entryId);
      setEntries(getLoreEntries());
      if (selectedLorebook) {
        const updatedBook = {
          ...selectedLorebook,
          entries: selectedLorebook.entries.filter(id => id !== entryId),
        };
        saveLorebook(updatedBook);
        setLorebooks(getLorebooks());
        setSelectedLorebook(updatedBook);
      }
    }
  };

  const handleImportLorebook = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const book = importLorebook(event.target?.result as string);
            saveLorebook(book);
            setLorebooks(getLorebooks());
            setEntries(getLoreEntries());
            alert(`Successfully imported lorebook: ${book.name}`);
          } catch (err) {
            alert('Failed to import lorebook. Please check the file format.');
            console.error(err);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportLorebook = (book: Lorebook) => {
    const json = exportLorebook(book);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.name.replace(/[^a-z0-9]/gi, '_')}_lorebook.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportEntry = () => {
    if (!selectedLorebook) {
      alert('Please select a lorebook first');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const entry = importLoreEntry(event.target?.result as string);
            saveLoreEntry(entry);
            const updatedBook = {
              ...selectedLorebook,
              entries: [...selectedLorebook.entries, entry.id],
            };
            saveLorebook(updatedBook);
            setLorebooks(getLorebooks());
            setEntries(getLoreEntries());
            setSelectedLorebook(updatedBook);
            alert(`Successfully imported entry: ${entry.name}`);
          } catch (err) {
            alert('Failed to import entry. Please check the file format.');
            console.error(err);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportEntry = (entry: LoreEntry) => {
    const json = exportLoreEntry(entry);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.name.replace(/[^a-z0-9]/gi, '_')}_entry.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedEntries = selectedLorebook
    ? entries.filter(e => selectedLorebook.entries.includes(e.id))
    : [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Lorebooks Sidebar */}
      <div className="w-80 bg-slate-800/50 border-r border-slate-700 overflow-y-auto">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Lorebooks</h2>
            <div className="flex gap-2">
              <button
                onClick={handleImportLorebook}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 rounded-xl transition-all"
                title="Import Lorebook"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCreateBook(true)}
                className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Library className="w-4 h-4" />
              Library
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'builder'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              LoreAI
            </button>
          </div>

          {lorebooks.map(book => (
            <div
              key={book.id}
              onClick={() => setSelectedLorebook(book)}
              className={`p-3 rounded-xl cursor-pointer transition-all group ${
                selectedLorebook?.id === book.id
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600/30 border border-cyan-500/50'
                  : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{book.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{book.entries.length} entries</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportLorebook(book);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cyan-600/20 rounded transition-all"
                    title="Export Lorebook"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLorebook(book.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {lorebooks.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No lorebooks yet
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'builder' ? (
          <LoreAIBuilder onEntrySaved={triggerRefresh} />
        ) : selectedLorebook ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedLorebook.name}</h1>
                <p className="text-slate-400">{selectedLorebook.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleImportEntry}
                  className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 rounded-xl transition-all flex items-center gap-2"
                  title="Import Entry"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button
                  onClick={() => setShowCreateEntry(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Entry
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {selectedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{entry.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-cyan-600 to-blue-600/20 text-purple-300 rounded">
                          {entry.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded">
                          Importance: {entry.importance}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExportEntry(entry)}
                        className="p-2 hover:bg-cyan-600/20 rounded transition-all"
                        title="Export Entry"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                      </button>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 hover:bg-slate-700 rounded transition-all"
                      >
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-2 hover:bg-red-600/20 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-2">{entry.content}</p>
                  {entry.keys.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.keys.map(key => (
                        <span key={key} className="text-xs px-2 py-1 bg-slate-700 text-gray-300 rounded">
                          {key}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">No Lorebook Selected</h3>
              <p className="text-gray-500">Select a lorebook or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Lorebook Modal */}
      {showCreateBook && (
        <CreateLorebookModal
          onClose={() => setShowCreateBook(false)}
          onCreate={handleCreateLorebook}
        />
      )}

      {/* Create/Edit Entry Modal */}
      {(showCreateEntry || editingEntry) && (
        <LoreEntryModal
          entry={editingEntry}
          onClose={() => {
            setShowCreateEntry(false);
            setEditingEntry(null);
          }}
          onSave={(data) => {
            if (editingEntry) {
              saveLoreEntry({ ...editingEntry, ...data, updatedAt: Date.now() });
            } else {
              handleCreateEntry(data);
            }
            setEntries(getLoreEntries());
            setShowCreateEntry(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
};

// Modal Components
const CreateLorebookModal: React.FC<{
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Create Lorebook</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="My World"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="A fantasy world..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => name && onCreate(name, description)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-colors"
            >
              Create
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoreEntryModal: React.FC<{
  entry: LoreEntry | null;
  onClose: () => void;
  onSave: (data: Partial<LoreEntry>) => void;
}> = ({ entry, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: entry?.name || '',
    content: entry?.content || '',
    keys: entry?.keys.join(', ') || '',
    category: entry?.category || 'other',
    importance: entry?.importance || 5,
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{entry ? 'Edit Entry' : 'New Entry'}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="character">Character</option>
              <option value="location">Location</option>
              <option value="event">Event</option>
              <option value="item">Item</option>
              <option value="concept">Concept</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
            <textarea
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={formData.keys}
              onChange={(e) => setFormData({ ...formData, keys: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="kingdom, magic, ancient"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Importance: {formData.importance}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onSave({
                ...formData,
                keys: formData.keys.split(',').map(k => k.trim()).filter(k => k),
              })}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-colors"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

