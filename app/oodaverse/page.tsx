"use client";

import * as React from "react";
import { ImagePlus, UploadCloud, Sparkles, FileJson, Trash2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

interface OodaVerseEntry {
  id: string;
  name: string;
  description?: string;
  json: Record<string, unknown>;
  imageDataUrl?: string;
  createdAt: number;
}

const STORAGE_KEY = "oodaverse-entries";

const safeParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default function OodaVersePage() {
  const [entries, setEntries] = React.useState<OodaVerseEntry[]>([]);
  const [jsonText, setJsonText] = React.useState("");
  const [jsonFileName, setJsonFileName] = React.useState<string | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const previewData = React.useMemo(() => {
    const parsed = safeParse(jsonText);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  }, [jsonText]);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = safeParse(stored);
      if (Array.isArray(parsed)) {
        setEntries(parsed as OodaVerseEntry[]);
      }
    }
  }, []);

  const persistEntries = React.useCallback((next: OodaVerseEntry[]) => {
    setEntries(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const handleJsonFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJsonText(text);
      setJsonFileName(file.name);
      setStatus("JSON loaded. Review and submit when ready.");
    };
    reader.readAsText(file);
  };

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const parsed = safeParse(jsonText);
    if (!parsed || typeof parsed !== "object") {
      setStatus("Invalid JSON. Please fix formatting before submitting.");
      return;
    }

    const typedParsed = parsed as Record<string, unknown>;
    const name = typeof typedParsed.name === "string" ? typedParsed.name : "Untitled Character";
    const description = typeof typedParsed.description === "string" ? typedParsed.description : undefined;

    const nextEntry: OodaVerseEntry = {
      id: crypto.randomUUID(),
      name,
      description,
      json: typedParsed,
      imageDataUrl: imagePreview ?? undefined,
      createdAt: Date.now()
    };

    const nextEntries = [nextEntry, ...entries];
    persistEntries(nextEntries);
    setStatus("Submitted to OodaVerse (local-only). Ready for the next upload.");
    setJsonText("");
    setJsonFileName(null);
    setImagePreview(null);
  };

  const handleRemove = (id: string) => {
    const nextEntries = entries.filter((entry) => entry.id !== id);
    persistEntries(nextEntries);
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200 shadow-glow">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            OodaVerse Public Exchange
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Upload Character JSONs + Images
          </h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            OodaVerse is a publicly accessible vault where anyone can drop a character
            profile. Submissions are stored locally for now until the DB integration
            goes live.
          </p>
        </header>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full justify-center">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="community">Community Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-1">
                <CardHeader>
                  <CardTitle>Drop a Character JSON</CardTitle>
                  <CardDescription>
                    Upload a JSON file or paste your character payload directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="jsonUpload">Character JSON File</Label>
                    <Input
                      id="jsonUpload"
                      type="file"
                      accept="application/json"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleJsonFile(event.target.files?.[0] ?? null)
                      }
                    />
                    {jsonFileName && (
                      <p className="text-xs text-slate-400">Loaded: {jsonFileName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jsonText">Or paste JSON</Label>
                    <Textarea
                      id="jsonText"
                      placeholder='{"name":"Nova","description":"Synth oracle"}'
                      value={jsonText}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setJsonText(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUpload">Character Image</Label>
                    <Input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleImageFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    <UploadCloud className="h-4 w-4" />
                    Submit to OodaVerse
                  </Button>
                  {status && <p className="text-sm text-cyan-200">{status}</p>}
                </CardContent>
              </Card>

              <Card className="p-1">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    See how your upload will appear to the community.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <FileJson className="h-6 w-6 text-cyan-200" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">
                        {previewData?.name?.toString() ?? "Character Name"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {previewData?.description?.toString() ?? "Description preview"}
                      </p>
                    </div>
                  </div>
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full rounded-2xl object-cover shadow-soft"
                    />
                  ) : (
                    <div className="h-40 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-slate-500">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="community">
            <div className="grid gap-6 md:grid-cols-2">
              {entries.length === 0 && (
                <Card className="p-1 md:col-span-2">
                  <CardHeader>
                    <CardTitle>No submissions yet</CardTitle>
                    <CardDescription>
                      Be the first to share a character with the OodaVerse.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              {entries.map((entry) => (
                <Card key={entry.id} className="p-1">
                  <CardHeader>
                    <CardTitle>{entry.name}</CardTitle>
                    <CardDescription>
                      {entry.description ?? "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entry.imageDataUrl && (
                      <img
                        src={entry.imageDataUrl}
                        alt={entry.name}
                        className="h-48 w-full rounded-2xl object-cover"
                      />
                    )}
                    <div className="rounded-2xl bg-black/40 p-4 text-xs text-slate-300">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(entry.json, null, 2)}
                      </pre>
                    </div>
                    <Button
                      onClick={() => handleRemove(entry.id)}
                      className="bg-white/5 border border-white/15 text-slate-100 hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
