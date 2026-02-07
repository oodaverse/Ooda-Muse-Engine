import React, { useMemo, useState } from 'react';
import { Send, Moon, Sparkles, Droplet, Mountain, Palette, ChevronDown } from 'lucide-react';

export default function ChatThemePreview() {
  const [activeTheme, setActiveTheme] = useState(0);
  const [message, setMessage] = useState('');
  const [edition, setEdition] = useState<'Light' | 'Dark' | 'Black'>('Light');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const tailwindThemes = [
    {
      name: 'Digital Blue',
      icon: Sparkles,
      colors: {
        bg: '#e5f0ff',
        surface: '#cce0ff',
        primary: '#99c2ff',
        accent: '#3385ff',
        text: '#0066ff',
        textSecondary: '#003d99'
      }
    },
    {
      name: 'Ash Grey',
      icon: Mountain,
      colors: {
        bg: '#f0f4f0',
        surface: '#e1eae1',
        primary: '#c3d5c3',
        accent: '#88aa88',
        text: '#6a956a',
        textSecondary: '#3f5a3f'
      }
    },
    {
      name: 'Crimson Carrot',
      icon: Moon,
      colors: {
        bg: '#feece7',
        surface: '#fdd9ce',
        primary: '#fbb39d',
        accent: '#f7673b',
        text: '#f5410a',
        textSecondary: '#932706'
      }
    },
    {
      name: 'Powder Blush',
      icon: Droplet,
      colors: {
        bg: '#ffe8e5',
        surface: '#ffd0cc',
        primary: '#ffa299',
        accent: '#ff4433',
        text: '#ff1500',
        textSecondary: '#990d00'
      }
    },
    {
      name: 'Pink Orchid',
      icon: Palette,
      colors: {
        bg: '#faeafa',
        surface: '#f4d6f5',
        primary: '#eaacec',
        accent: '#d45ad8',
        text: '#c930cf',
        textSecondary: '#791d7c'
      }
    },
    {
      name: 'Watermelon',
      icon: Send,
      colors: {
        bg: '#fee7ec',
        surface: '#fccfd9',
        primary: '#f99fb2',
        accent: '#f43e66',
        text: '#f10e3f',
        textSecondary: '#910826'
      }
    },
    {
      name: 'Bright Amber',
      icon: Moon,
      colors: {
        bg: '#fefae7',
        surface: '#fcf4cf',
        primary: '#fae99e',
        accent: '#f5d33d',
        text: '#f2c80d',
        textSecondary: '#917808'
      }
    },
    {
      name: 'Majorelle Blue',
      icon: Sparkles,
      colors: {
        bg: '#e9e8fd',
        surface: '#d2d0fb',
        primary: '#a5a1f7',
        accent: '#4c43ef',
        text: '#1f14eb',
        textSecondary: '#130c8d'
      }
    }
  ];

    const gradientThemes = [
      {
        name: 'Ember Earth Gradient',
        icon: Sparkles,
        colors: {
          bg: 'linear-gradient(90deg, hsla(23,41%,9%,1) 0%, hsla(18,16%,53%,1) 100%)',
          surface: '#1F140D',
          primary: '#9B8074',
          accent: '#735345',
          text: '#e6dcd6',
          textSecondary: '#9B8074'
        }
      },
      {
        name: 'Violet Ember Gradient',
        icon: Moon,
        colors: {
          bg: 'linear-gradient(90deg, hsla(296,100%,6%,1) 0%, hsla(5,90%,24%,1) 100%)',
          surface: '#1F0021',
          primary: '#751006',
          accent: '#c11e38',
          text: '#f2dce6',
          textSecondary: '#751006'
        }
      },
      {
        name: 'Midnight Green Gradient',
        icon: Mountain,
        colors: {
          bg: 'linear-gradient(90deg, hsla(0,0%,5%,1) 0%, hsla(126,82%,33%,1) 100%)',
          surface: '#0C0C0C',
          primary: '#0F971C',
          accent: '#0F971C',
          text: '#dfeee0',
          textSecondary: '#0F971C'
        }
      },
      {
        name: 'Rose Ember Gradient',
        icon: Palette,
        colors: {
          bg: 'linear-gradient(90deg, hsla(350,73%,44%,1) 0%, hsla(274,65%,12%,1) 100%)',
          surface: '#220B34',
          primary: '#c11e38',
          accent: '#220b34',
          text: '#ffd6e0',
          textSecondary: '#c11e38'
        }
      },
      {
        name: 'Tri-Shift Gradient',
        icon: Droplet,
        colors: {
          bg: 'linear-gradient(90deg, hsla(154,53%,82%,1) 0%, hsla(24,88%,65%,1) 50%, hsla(216,56%,16%,1) 100%)',
          surface: '#B8E9D4',
          primary: '#F4985A',
          accent: '#16425a',
          text: '#072227',
          textSecondary: '#F4985A'
        }
      },
      {
        name: 'Deep Ocean Gradient',
        icon: Send,
        colors: {
          bg: 'linear-gradient(90deg, hsla(205,46%,10%,1) 0%, hsla(191,28%,23%,1) 50%, hsla(207,41%,27%,1) 100%)',
          surface: '#0E1C26',
          primary: '#2A454B',
          accent: '#2A454B',
          text: '#bcdfe8',
          textSecondary: '#2A454B'
        }
      },
      {
        name: 'Steel Blue Gradient',
        icon: Sparkles,
        colors: {
          bg: 'linear-gradient(90deg, hsla(213,77%,14%,1) 0%, hsla(202,27%,45%,1) 100%)',
          surface: '#08203E',
          primary: '#557C93',
          accent: '#557C93',
          text: '#dcecf6',
          textSecondary: '#557C93'
        }
      },
      {
        name: 'Sapphire Gradient',
        icon: Mountain,
        colors: {
          bg: 'linear-gradient(90deg, hsla(221,45%,73%,1) 0%, hsla(220,78%,29%,1) 100%)',
          surface: '#9BAFD9',
          primary: '#103783',
          accent: '#103783',
          text: '#081230',
          textSecondary: '#103783'
        }
      }
    ];

    const hexPalettes = [
      {
        name: 'Ink Black',
        icon: Moon,
        colors: { bg: '#e7f5fd', surface: '#d0ebfb', primary: '#139cec', accent: '#42b0f0', text: '#041f2f', textSecondary: '#0b5e8e' }
      },
      {
        name: 'Alabaster Grey',
        icon: Palette,
        colors: { bg: '#f0f1f4', surface: '#e2e4e9', primary: '#6c7893', accent: '#8a93a8', text: '#16181d', textSecondary: '#414858' }
      },
      {
        name: 'Bright Lemon',
        icon: Sparkles,
        colors: { bg: '#fefde6', surface: '#fdface', primary: '#f6e609', accent: '#f8eb3a', text: '#312e02', textSecondary: '#948a05' }
      },
      {
        name: 'Coffee Bean',
        icon: Droplet,
        colors: { bg: '#fcf0e8', surface: '#f9e1d2', primary: '#e3681c', accent: '#e98649', text: '#2d1506', textSecondary: '#883f11' }
      },
      {
        name: 'Oxford Navy',
        icon: Mountain,
        colors: { bg: '#e7f1fe', surface: '#cfe4fc', primary: '#0d78f2', accent: '#3d93f5', text: '#031830', textSecondary: '#084891' }
      },
      {
        name: 'Carbon Black',
        icon: Send,
        colors: { bg: '#f0f5f5', surface: '#e1eaea', primary: '#699696', accent: '#87abab', text: '#151e1e', textSecondary: '#3f5a5a' }
      },
      {
        name: 'Turquoise',
        icon: Palette,
        colors: { bg: '#eafaf7', surface: '#d6f5ef', primary: '#30cfaf', accent: '#5ad8bf', text: '#0a2923', textSecondary: '#1d7c69' }
      },
      {
        name: 'Mahogany Red',
        icon: Moon,
        colors: { bg: '#fce9e9', surface: '#f8d4d3', primary: '#dd2622', accent: '#e3514f', text: '#2c0807', textSecondary: '#841715' }
      },
      {
        name: 'Frosted Mint',
        icon: Sparkles,
        colors: { bg: '#ebffe5', surface: '#d7ffcc', primary: '#37ff00', accent: '#5fff33', text: '#0b3300', textSecondary: '#219900' }
      },
      {
        name: 'Spicy Paprika',
        icon: Droplet,
        colors: { bg: '#fcede8', surface: '#f9dbd2', primary: '#e24b1d', accent: '#e86f4a', text: '#2d0f06', textSecondary: '#872d12' }
      },
      {
        name: 'Dusty Rose',
        icon: Palette,
        colors: { bg: '#f7eeed', surface: '#f0dcdb', primary: '#b4524b', accent: '#c3756f', text: '#24100f', textSecondary: '#6c312d' }
      },
      {
        name: 'Jet Black',
        icon: Send,
        colors: { bg: '#eff5f4', surface: '#dfecea', primary: '#609f94', accent: '#80b3a9', text: '#13201e', textSecondary: '#396059' }
      },
      {
        name: 'Midnight Violet',
        icon: Moon,
        colors: { bg: '#fbeafb', surface: '#f6d5f6', primary: '#d42bd4', accent: '#dc56dc', text: '#2a092a', textSecondary: '#7f1a7f' }
      }
    ];

    const baseThemes = [...tailwindThemes, ...gradientThemes, ...hexPalettes];

    const makeDark = (base: any) => ({
      ...base,
      name: `${base.name} Dark`,
      colors: {
        bg: base.colors.text,
        surface: base.colors.textSecondary || '#111111',
        primary: base.colors.accent || base.colors.primary,
        accent: base.colors.primary || base.colors.accent,
        text: base.colors.bg || '#ffffff',
        textSecondary: base.colors.surface || '#888888'
      }
    });

    const makeBlack = (base: any) => ({
      ...base,
      name: `${base.name} Black Edition`,
      colors: {
        bg: base.colors.bg || '#050505',
        surface: '#000000',
        primary: base.colors.primary,
        accent: base.colors.accent,
        text: base.colors.text || '#ffffff',
        textSecondary: base.colors.textSecondary || '#888888'
      }
    });

    const currentBase = baseThemes[activeTheme] || baseThemes[0];
    const currentTheme = edition === 'Light' ? currentBase : edition === 'Dark' ? makeDark(currentBase) : makeBlack(currentBase);

    const isGradient = (value: string) => typeof value === 'string' && value.includes('gradient');

    const hexToRgb = (hex: string) => {
      const cleaned = hex.replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
      const num = parseInt(cleaned, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm:
            h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
            break;
          case gNorm:
            h = (bNorm - rNorm) / d + 2;
            break;
          default:
            h = (rNorm - gNorm) / d + 4;
            break;
        }
        h *= 60;
      }
      return { h, s: s * 100, l: l * 100 };
    };

    const getLuminance = (r: number, g: number, b: number) => {
      const toLinear = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const R = toLinear(r);
      const G = toLinear(g);
      const B = toLinear(b);
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };

    const isHighYellowOrDeepRed = (hex: string) => {
      const rgb = hexToRgb(hex);
      if (!rgb) return false;
      const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const isYellow = h >= 40 && h <= 70;
      const isRed = h <= 15 || h >= 345;
      return (isYellow || isRed) && s > 55;
    };

    const getReadableTextForBackground = (bg: string) => {
      const rgb = hexToRgb(bg);
      if (!rgb) return '#f5f7fa';
      const lum = getLuminance(rgb.r, rgb.g, rgb.b);
      return lum < 0.45 ? '#f5f7fa' : '#1f2937';
    };

    const getReadableSecondary = (bg: string) => {
      const rgb = hexToRgb(bg);
      if (!rgb) return '#cbd5e1';
      const lum = getLuminance(rgb.r, rgb.g, rgb.b);
      return lum < 0.45 ? '#cbd5e1' : '#475569';
    };

    const safeText = useMemo(() => {
      const bg = currentTheme.colors.bg;
      const base = typeof currentTheme.colors.text === 'string' ? currentTheme.colors.text : '#f5f7fa';
      if (typeof bg !== 'string' || isGradient(bg)) return '#f5f7fa';
      if (base.startsWith('#') && !isHighYellowOrDeepRed(base)) return base;
      return getReadableTextForBackground(bg);
    }, [currentTheme.colors.bg, currentTheme.colors.text]);

    const safeTextSecondary = useMemo(() => {
      const bg = currentTheme.colors.bg;
      const base = typeof currentTheme.colors.textSecondary === 'string' ? currentTheme.colors.textSecondary : '#cbd5e1';
      if (typeof bg !== 'string' || isGradient(bg)) return '#cbd5e1';
      if (base.startsWith('#') && !isHighYellowOrDeepRed(base)) return base;
      return getReadableSecondary(bg);
    }, [currentTheme.colors.bg, currentTheme.colors.textSecondary]);
  
  const messages = [
    { role: 'assistant', text: 'Hello! I\'m here to help. This chat interface showcases different color themes. Try switching between them!' },
    { role: 'user', text: 'This looks great! I love the color schemes.' },
    { role: 'assistant', text: 'Thank you! Each theme uses a carefully curated color palette. Feel free to explore all five themes using the tabs above.' },
  ];
  
  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
    }
  };
  
  return (
    <div
      style={{
        background: typeof currentTheme.colors.bg === 'string' && currentTheme.colors.bg.includes('gradient') ? undefined : currentTheme.colors.bg,
        backgroundImage: typeof currentTheme.colors.bg === 'string' && currentTheme.colors.bg.includes('gradient') ? currentTheme.colors.bg : undefined,
        minHeight: '100vh',
        padding: '24px',
        transition: 'background 0.3s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Theme Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            style={{
              background: currentTheme.colors.surface,
              color: safeText,
              border: `2px solid ${currentTheme.colors.accent}`,
              padding: '12px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600 as any
            }}
          >
            {React.createElement(currentBase.icon, { size: 18 })}
            {currentBase.name}
            <ChevronDown size={16} />
          </button>

          {isThemeMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                left: 0,
                zIndex: 30,
                minWidth: '260px',
                background: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.accent}`,
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
              }}
            >
              {baseThemes.map((theme, index) => (
                <button
                  key={theme.name}
                  onClick={() => {
                    setActiveTheme(index);
                    setIsThemeMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    background: index === activeTheme ? currentTheme.colors.primary : 'transparent',
                    color: safeText,
                    border: 'none',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  {React.createElement(theme.icon, { size: 16 })}
                  {theme.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: safeTextSecondary }}>Edition</label>
          <select
            value={edition}
            onChange={(e) => setEdition(e.target.value as any)}
            style={{ padding: '8px', borderRadius: '8px', background: currentTheme.colors.surface, color: safeText }}
          >
            <option value="Light">Light</option>
            <option value="Dark">Dark</option>
            <option value="Black">Black</option>
          </select>
        </div>
      </div>
      
      {/* Chat Container */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: currentTheme.colors.surface,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: `0 8px 32px ${currentTheme.colors.bg && currentTheme.colors.bg.startsWith ? (currentTheme.colors.bg.startsWith('#') ? currentTheme.colors.bg + '80' : 'rgba(0,0,0,0.35)') : 'rgba(0,0,0,0.35)'}`,
        transition: 'all 0.3s ease'
      }}>
        {/* Messages */}
        <div style={{ 
          marginBottom: '24px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  background: msg.role === 'user' ? currentTheme.colors.accent : currentTheme.colors.primary,
                  color: msg.role === 'user' ? getReadableTextForBackground(currentTheme.colors.accent) : safeText,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  maxWidth: '70%',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  transition: 'all 0.3s ease'
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        
        {/* Input Area */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              background: currentTheme.colors.bg,
              color: safeText,
              border: `2px solid ${currentTheme.colors.primary}`,
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '15px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: currentTheme.colors.accent,
              color: currentTheme.colors.bg,
              border: 'none',
              padding: '12px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              fontWeight: '600'
            }}
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Color Palette Display */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: currentTheme.colors.bg,
          borderRadius: '12px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            color: currentTheme.colors.text,
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Current Palette
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(currentTheme.colors).map(([name, color]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: safeTextSecondary
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    background: String(color),
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.colors.primary}`
                  }}
                />
                {typeof color === 'string' ? color.toUpperCase() : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}