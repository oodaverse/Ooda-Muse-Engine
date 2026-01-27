import React, { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { Minimize2, Maximize2, X, Move } from 'lucide-react';
import { GalleryItem } from '../types';

interface OracleViewerProps {
  item: GalleryItem;
  onClose: () => void;
}

export const OracleViewer: React.FC<OracleViewerProps> = ({ item, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 640, height: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const [mediaUrl, setMediaUrl] = useState<string>('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const plyrRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (item.type === 'embed') {
      setMediaUrl('');
      return;
    }
    if (item.blob) {
      const url = URL.createObjectURL(item.blob);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [item.type, item.blob]);

  useEffect(() => {
    if (item.type === 'video' && mediaRef.current && mediaUrl) {
      plyrRef.current = new Plyr(mediaRef.current as HTMLVideoElement, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
        settings: ['speed', 'loop'],
        speed: { selected: 1, options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        loop: { active: true },
        ratio: '16:9',
        tooltips: { controls: true, seek: true }
      });

      return () => {
        if (plyrRef.current) {
          plyrRef.current.destroy();
        }
      };
    }
  }, [item.type, mediaUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).closest('.oracle-drag-handle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;
      const newWidth = Math.max(320, resizeStart.width + deltaX);
      const newHeight = Math.max(240, resizeStart.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, position, resizeStart]);

  return (
    <div
      ref={containerRef}
      className="fixed bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl shadow-2xl shadow-cyan-500/20 overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: 9999
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="oracle-drag-handle bg-slate-800/90 backdrop-blur-xl border-b border-slate-700/50 px-4 py-2 flex items-center justify-between cursor-move select-none">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">
            {item.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-600 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Media Content */}
      {!isMinimized && (
        <div className="relative w-full h-full bg-black">
          {item.type === 'video' ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={mediaUrl}
              className="w-full h-full"
              playsInline
              loop
            />
          ) : item.type === 'embed' ? (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              {item.embedCode ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: item.embedCode }}
                />
              ) : item.embedUrl ? (
                <iframe src={item.embedUrl} className="w-full h-full" allowFullScreen />
              ) : (
                <div className="text-slate-400 text-sm">No embed content</div>
              )}
            </div>
          ) : (
            <img
              ref={mediaRef as React.RefObject<HTMLImageElement>}
              src={mediaUrl}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          )}

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize hover:opacity-100 opacity-50 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
              setResizeStart({
                width: size.width,
                height: size.height,
                mouseX: e.clientX,
                mouseY: e.clientY
              });
            }}
          >
            <svg className="w-full h-full text-cyan-500" viewBox="0 0 16 16">
              <path d="M16 0 L16 16 L0 16 Z" fill="currentColor" opacity="0.3" />
              <path d="M10 6 L10 10 L6 10" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
