import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GalleryItem } from '../types';

interface GalleryDB extends DBSchema {
  gallery: {
    key: string;
    value: {
      id: string;
      characterId?: string;
      type: 'image' | 'video' | 'embed';
      name: string;
      blob?: Blob;
      embedCode?: string;
      embedUrl?: string;
      thumbnail?: string;
      createdAt: number;
      tags?: string[];
    };
    indexes: { 'by-character': string; 'by-type': string; };
  };
}

let dbInstance: IDBPDatabase<GalleryDB> | null = null;

async function getDB(): Promise<IDBPDatabase<GalleryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<GalleryDB>('dreamweaver-gallery', 1, {
    upgrade(db) {
      const store = db.createObjectStore('gallery', { keyPath: 'id' });
      store.createIndex('by-character', 'characterId');
      store.createIndex('by-type', 'type');
    },
  });

  return dbInstance;
}

export async function saveGalleryItem(item: Omit<GalleryItem, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDB();
  const id = `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const galleryItem: GalleryItem = {
    ...item,
    id,
    createdAt: Date.now(),
  };

  await db.add('gallery', galleryItem);
  return id;
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  const db = await getDB();
  return await db.get('gallery', id);
}

export async function getAllGalleryItems(): Promise<GalleryItem[]> {
  const db = await getDB();
  return await db.getAll('gallery');
}

export async function getGalleryItemsByCharacter(characterId: string): Promise<GalleryItem[]> {
  const db = await getDB();
  return await db.getAllFromIndex('gallery', 'by-character', characterId);
}

export async function getGalleryItemsByType(type: 'image' | 'video'): Promise<GalleryItem[]> {
  const db = await getDB();
  return await db.getAllFromIndex('gallery', 'by-type', type);
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('gallery', id);
}

export async function updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<void> {
  const db = await getDB();
  const item = await db.get('gallery', id);
  if (item) {
    await db.put('gallery', { ...item, ...updates });
  }
}

export async function createThumbnail(file: File): Promise<string | undefined> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(undefined);

          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  } else if (file.type.startsWith('video/')) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(undefined);

      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };

      video.onseeked = () => {
        canvas.width = 200;
        canvas.height = (video.videoHeight / video.videoWidth) * 200;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  }
  return undefined;
}
