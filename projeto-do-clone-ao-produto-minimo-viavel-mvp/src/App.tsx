/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Triangle, Pentagon, Circle, Cloud, Palette, Check, Download, Code, Share2, Copy, X, LogIn, LogOut, Save, Trash2, Bookmark, User as UserIcon, Sparkles, Loader2, Shapes, Waves, AlertCircle, Grid, Layers, RotateCw, Maximize, Settings, Eye } from 'lucide-react';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp, Timestamp, limit, orderBy } from 'firebase/firestore';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// --- AI Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- AI Tools ---
const aiTools: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "setShape",
        description: "Altera os parâmetros da forma (modo, complexidade, contraste, cor, etc).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: { type: Type.STRING, enum: ["organic", "geometric"], description: "Modo da forma: 'organic' para formas fluidas, 'geometric' para polígonos/estrelas." },
            complexity: { type: Type.NUMBER, description: "Complexidade (1-8). No modo orgânico, controla o número de picos." },
            contrast: { type: Type.NUMBER, description: "Contraste/Aleatoriedade (1-8). No modo orgânico, controla o quão irregular é a forma." },
            color: { type: Type.STRING, description: "Cor principal em formato hex (ex: #FF5733)." },
            seed: { type: Type.NUMBER, description: "Semente de aleatoriedade (0-1)." },
            geometricType: { type: Type.STRING, enum: ["star", "polygon"], description: "Tipo geométrico (apenas para modo geometric)." },
            sides: { type: Type.NUMBER, description: "Número de lados ou pontas (3-20, apenas para modo geometric)." },
            innerRadius: { type: Type.NUMBER, description: "Raio interno para estrelas (0.1-0.9, apenas para modo geometric tipo star)." },
            rotation: { type: Type.NUMBER, description: "Rotação da forma em graus (0-360)." }
          }
        }
      },
      {
        name: "setPattern",
        description: "Altera os parâmetros do padrão ou textura aplicada à forma.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["solid", "stripes", "dots", "checkerboard", "waves", "noise"], description: "Tipo de padrão. 'solid' remove o padrão." },
            scale: { type: Type.NUMBER, description: "Escala do padrão (0.2 a 3.0)." },
            rotation: { type: Type.NUMBER, description: "Rotação do padrão em graus (0-360)." },
            density: { type: Type.NUMBER, description: "Densidade ou espessura das linhas/pontos (0.1 a 5.0)." },
            color: { type: Type.STRING, description: "Cor do padrão em formato hex." }
          }
        }
      },
      {
        name: "randomize",
        description: "Aleatoriza as opções da interface.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: { type: Type.STRING, enum: ["all", "shape", "pattern"], description: "O que deve ser aleatorizado. 'all' para tudo, 'shape' para a forma, 'pattern' para o padrão." }
          },
          required: ["target"]
        }
      },
      {
        name: "saveForma",
        description: "Salva a forma atual na coleção do usuário."
      },
      {
        name: "copyCode",
        description: "Copia o código SVG da forma para a área de transferência."
      },
      {
        name: "shareForma",
        description: "Abre o menu de compartilhamento da forma."
      },
      {
        name: "openCollection",
        description: "Abre a modal com a coleção de formas salvas."
      },
      {
        name: "downloadForma",
        description: "Inicia o download da forma atual.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            format: { type: Type.STRING, enum: ["svg", "png"], description: "Formato do arquivo para download." }
          },
          required: ["format"]
        }
      },
      {
        name: "setAccessibility",
        description: "Altera as configurações de acessibilidade (alto contraste e modo daltonismo).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            highContrast: { type: Type.BOOLEAN, description: "Ativa ou desativa o modo de alto contraste." },
            colorBlindMode: { type: Type.STRING, enum: ["none", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"], description: "Define o modo de daltonismo." }
          }
        }
      }
    ]
  }
];

// --- Types ---

interface SavedForma {
  id: string;
  uid: string;
  name: string;
  path: string;
  color: string;
  complexity: number;
  contrast: number;
  seed: number;
  createdAt: any;
  pattern?: string;
  patternConfig?: PatternConfig;
  rotation?: number;
}

type PatternType = 'solid' | 'stripes' | 'dots' | 'checkerboard' | 'waves' | 'noise';

interface PatternConfig {
  type: PatternType;
  scale: number;
  rotation: number;
  density: number;
  color: string;
}

// --- Constants ---

const PRESET_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', 
  '#33FFF6', '#F6FF33', '#FF8C33', '#8C33FF', '#33FF8C'
];

// --- Utilities ---

/**
 * Generates a forma SVG path based on complexity and randomness.
 */
function generateFormaPath(complexity: number, randomness: number, seed: number, complexitySlider: number) {
  const size = 400;
  const center = size / 2;
  
  // Dynamic scaling logic:
  // Max size at S1=8 (Right), S2=1 (Left)
  // randomness is 0-1 (randomnessValue)
  // complexitySlider is 1-8
  const sizeScale = (0.7 + (complexitySlider / 8) * 0.3) * (1.0 - (randomness * 0.25));
  const baseRadius = 100 * sizeScale; 
  
  const points: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / complexity;

  const seededRandom = (i: number, offset: number = 0) => {
    const x = Math.sin(seed + i + offset) * 10000;
    return x - Math.floor(x);
  };

  const rotation = seed * Math.PI;

  for (let i = 0; i < complexity; i++) {
    // Subtle angular jitter
    const jitter = (seededRandom(i, 500) - 0.5) * randomness * (angleStep * 0.4);
    const angle = i * angleStep + rotation + jitter;
    
    // Organic noise layers
    const noise1 = (seededRandom(i, 100) - 0.5) * 1.4;
    const noise2 = (seededRandom(i, 200) - 0.5) * 0.5;
    const rVar = (noise1 + noise2) * randomness * (90 * sizeScale);
    
    const r = baseRadius + rVar;
    
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    points.push({ x, y });
  }

  // Create smooth path using cubic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];
    
    // Splatter effect: less smoothing makes it look more like ink
    const smoothFactor = 0.25;
    const cp1x = p1.x + (p2.x - points[(i - 1 + points.length) % points.length].x) * smoothFactor;
    const cp1y = p1.y + (p2.y - points[(i - 1 + points.length) % points.length].y) * smoothFactor;
    const cp2x = p2.x - (p3.x - p1.x) * smoothFactor;
    const cp2y = p2.y - (p3.y - p1.y) * smoothFactor;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path + ' Z';
}

/**
 * Generates a geometric SVG path based on type and parameters.
 */
function generateGeometricPath(type: string, sides: number, innerRadiusFactor: number) {
  const size = 400;
  const center = size / 2;
  const radius = 140;

  if (type === 'star') {
    const points = sides;
    const innerRadius = radius * innerRadiusFactor;
    let path = "";
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      path += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
    }
    return path + " Z";
  }

  if (type === 'polygon') {
    let path = "";
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * i * 2) / sides - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      path += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
    }
    return path + " Z";
  }

  return "";
}

/**
 * Generates an SVG pattern based on configuration.
 */
function generatePattern(config: PatternConfig, id: string) {
  const { type, scale, rotation, density, color } = config;
  const size = 20 * scale;
  const strokeWidth = 2 * density;

  if (type === 'solid') return null;

  let content = null;

  switch (type) {
    case 'stripes':
      content = (
        <line 
          x1="0" y1="0" x2="0" y2={size} 
          stroke={color} 
          strokeWidth={strokeWidth} 
        />
      );
      break;
    case 'dots':
      content = (
        <circle 
          cx={size / 2} cy={size / 2} 
          r={strokeWidth / 2} 
          fill={color} 
        />
      );
      break;
    case 'checkerboard':
      content = (
        <>
          <rect width={size / 2} height={size / 2} fill={color} />
          <rect x={size / 2} y={size / 2} width={size / 2} height={size / 2} fill={color} />
        </>
      );
      break;
    case 'waves':
      const h = size / 2;
      content = (
        <path 
          d={`M 0 ${h} Q ${size / 4} ${h - strokeWidth * 2}, ${size / 2} ${h} T ${size} ${h}`} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
        />
      );
      break;
    case 'noise':
      // Simple noise using multiple small dots
      content = (
        <>
          <circle cx={size * 0.2} cy={size * 0.3} r={strokeWidth / 4} fill={color} />
          <circle cx={size * 0.7} cy={size * 0.1} r={strokeWidth / 4} fill={color} />
          <circle cx={size * 0.5} cy={size * 0.8} r={strokeWidth / 4} fill={color} />
          <circle cx={size * 0.9} cy={size * 0.6} r={strokeWidth / 4} fill={color} />
        </>
      );
      break;
  }

  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={size}
      height={size}
      patternTransform={`rotate(${rotation})`}
    >
      {content}
    </pattern>
  );
}

export default function App() {
  const [complexity, setComplexity] = useState(6); 
  const [contrast, setContrast] = useState(1); 
  const [color, setColor] = useState('#FF5733');
  const [seed, setSeed] = useState(Math.random());
  const [showPalette, setShowPalette] = useState(false);
  const [showPatternConfig, setShowPatternConfig] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Mode State
  const [mode, setMode] = useState<'organic' | 'geometric'>('organic');
  const [geometricType, setGeometricType] = useState<'star' | 'polygon'>('polygon');
  const [sides, setSides] = useState(6);
  const [innerRadius, setInnerRadius] = useState(0.4);
  const [rotation, setRotation] = useState(0);

  // Pattern State
  const [patternType, setPatternType] = useState<PatternType>('solid');
  const [patternScale, setPatternScale] = useState(1);
  const [patternRotation, setPatternRotation] = useState(0);
  const [patternDensity, setPatternDensity] = useState(1);
  const [patternColor, setPatternColor] = useState('#000000');
  const [showPatternPalette, setShowPatternPalette] = useState(false);

  // Accessibility State
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'>('none');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // AI State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<{ text: string, targetMode: 'organic' | 'geometric' } | null>(null);
  
  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [savedFormas, setSavedFormas] = useState<SavedForma[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          createdAt: serverTimestamp()
        }, { merge: true }).catch(err => console.error('Error syncing user:', err));
      } else {
        setSavedFormas([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Formas Listener - Use client-side sorting to avoid index requirements
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'blobs'), 
      where('uid', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const formas: SavedForma[] = [];
      snapshot.forEach((doc) => {
        formas.push({ id: doc.id, ...doc.data() } as SavedForma);
      });
      
      // Sort and limit client-side
      const sortedFormas = formas
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 10);
        
      setSavedFormas(sortedFormas);
    }, (err) => {
      console.error('Error fetching formas:', err);
      // Non-fatal error for background sync
    });

    return () => unsubscribe();
  }, [user]);

  const saveForma = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'blobs'), {
        uid: user.uid,
        name: `Forma ${savedFormas.length + 1}`,
        path: formaPath,
        color: color,
        complexity: complexity,
        contrast: contrast,
        seed: seed,
        rotation: rotation,
        createdAt: serverTimestamp(),
        pattern: patternType,
        patternConfig: {
          type: patternType,
          scale: patternScale,
          rotation: patternRotation,
          density: patternDensity,
          color: patternColor
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'blobs');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteForma = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blobs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `blobs/${id}`);
    }
  };

  const loadForma = (b: SavedForma) => {
    setComplexity(b.complexity);
    setContrast(b.contrast);
    setSeed(b.seed);
    setColor(b.color);
    if (b.rotation !== undefined) setRotation(b.rotation);
    if (b.pattern) setPatternType(b.pattern as PatternType);
    if (b.patternConfig) {
      setPatternScale(b.patternConfig.scale);
      setPatternRotation(b.patternConfig.rotation);
      setPatternDensity(b.patternConfig.density);
      setPatternColor(b.patternConfig.color);
    }
    setShowHistoryModal(false);
  };

  const generateWithAI = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setSuggestion(null);
    try {
      const currentState = {
        mode,
        complexity,
        contrast,
        color,
        geometricType,
        sides,
        innerRadius,
        rotation,
        pattern: {
          type: patternType,
          scale: patternScale,
          rotation: patternRotation,
          density: patternDensity,
          color: patternColor
        },
        accessibility: {
          highContrast: isHighContrast,
          colorBlindMode: colorBlindMode
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `O usuário disse: "${prompt}". 
        Estado atual: ${JSON.stringify(currentState)}.
        Use as ferramentas disponíveis para atender ao pedido do usuário. 
        Você pode alterar a forma, o padrão, aleatorizar, salvar ou baixar.
        Se o usuário pedir algo que exija mudar de modo (ex: de orgânico para estrela), use setShape com o novo modo.`,
        config: {
          tools: aiTools,
        },
      });

      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const { name, args } = call;
          
          if (name === 'setShape') {
            const p = args as any;
            if (p.mode && p.mode !== mode) {
              setMode(p.mode as 'organic' | 'geometric');
            }
            if (p.complexity !== undefined) setComplexity(Math.max(1, Math.min(8, Math.round(p.complexity))));
            if (p.contrast !== undefined) setContrast(Math.max(1, Math.min(8, Math.round(p.contrast))));
            if (p.color) setColor(p.color.startsWith('#') ? p.color : `#${p.color}`);
            if (p.seed !== undefined) setSeed(p.seed);
            if (p.geometricType) setGeometricType(p.geometricType as 'star' | 'polygon');
            if (p.sides !== undefined) setSides(Math.max(3, Math.min(20, Math.round(p.sides))));
            if (p.innerRadius !== undefined) setInnerRadius(p.innerRadius);
            if (p.rotation !== undefined) setRotation(p.rotation);
          }
          
          if (name === 'setPattern') {
            const p = args as any;
            if (p.type) setPatternType(p.type as PatternType);
            if (p.scale !== undefined) setPatternScale(p.scale);
            if (p.rotation !== undefined) setPatternRotation(p.rotation);
            if (p.density !== undefined) setPatternDensity(p.density);
            if (p.color) setPatternColor(p.color.startsWith('#') ? p.color : `#${p.color}`);
          }
          
          if (name === 'randomize') {
            const { target } = args as { target: 'all' | 'shape' | 'pattern' };
            if (target === 'all') randomize();
            else if (target === 'shape') randomizeMoldar();
            else if (target === 'pattern') randomizePattern();
          }
          
          if (name === 'saveForma') {
            saveForma();
          }
          
          if (name === 'copyCode') {
            copyToClipboard();
          }
          
          if (name === 'shareForma') {
            shareForma();
          }
          
          if (name === 'openCollection') {
            setShowHistoryModal(true);
          }
          
          if (name === 'downloadForma') {
            const { format } = args as { format: 'svg' | 'png' };
            if (format === 'svg') downloadSvg();
            else downloadPng();
          }

          if (name === 'setAccessibility') {
            const { highContrast, colorBlindMode: cbMode } = args as { highContrast?: boolean, colorBlindMode?: any };
            if (highContrast !== undefined) setIsHighContrast(highContrast);
            if (cbMode !== undefined) setColorBlindMode(cbMode);
          }
        }
        setPrompt('');
      } else if (response.text) {
        // Se não houver chamadas de função, mas houver texto, pode ser uma resposta direta ou erro de entendimento
        // Vamos apenas limpar o prompt se a IA respondeu algo
        setPrompt('');
      }
    } catch (err) {
      console.error('AI Generation error:', err);
      alert('Erro ao processar com IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Map slider values (1-8)
  // Slider 1: 3 points at left (1), 5 points at right (8)
  const complexityValue = useMemo(() => {
    // Map 1-8 to 3-5 peaks
    if (complexity <= 3) return 3;
    if (complexity <= 6) return 4;
    return 5;
  }, [complexity]);

  // Slider 2: Contrast (Randomness) (0 to 1)
  const contrastValue = useMemo(() => {
    return (contrast - 1) / 7;
  }, [contrast]);

  const formaPath = useMemo(() => {
    if (mode === 'organic') {
      return generateFormaPath(complexityValue, contrastValue, seed, complexity);
    } else {
      return generateGeometricPath(geometricType, sides, innerRadius);
    }
  }, [mode, geometricType, sides, innerRadius, complexityValue, contrastValue, seed, complexity]);

  const patternId = useMemo(() => `pattern-${seed.toString().replace('.', '')}`, [seed]);
  
  const patternElement = useMemo(() => {
    return generatePattern({
      type: patternType,
      scale: patternScale,
      rotation: patternRotation,
      density: patternDensity,
      color: patternColor
    }, patternId);
  }, [patternType, patternScale, patternRotation, patternDensity, patternColor, patternId]);

  const svgCode = useMemo(() => {
    const patternSvg = patternType !== 'solid' ? `
    <defs>
      <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${20 * patternScale}" height="${20 * patternScale}" patternTransform="rotate(${patternRotation})">
        ${patternType === 'stripes' ? `<line x1="0" y1="0" x2="0" y2="${20 * patternScale}" stroke="${patternColor}" stroke-width="${2 * patternDensity}" />` : ''}
        ${patternType === 'dots' ? `<circle cx="${10 * patternScale}" cy="${10 * patternScale}" r="${patternDensity}" fill="${patternColor}" />` : ''}
        ${patternType === 'checkerboard' ? `<rect width="${10 * patternScale}" height="${10 * patternScale}" fill="${patternColor}" /><rect x="${10 * patternScale}" y="${10 * patternScale}" width="${10 * patternScale}" height="${10 * patternScale}" fill="${patternColor}" />` : ''}
        ${patternType === 'waves' ? `<path d="M 0 ${10 * patternScale} Q ${5 * patternScale} ${10 * patternScale - 2 * patternDensity}, ${10 * patternScale} ${10 * patternScale} T ${20 * patternScale} ${10 * patternScale}" fill="none" stroke="${patternColor}" stroke-width="${2 * patternDensity}" />` : ''}
        ${patternType === 'noise' ? `<circle cx="${4 * patternScale}" cy="${6 * patternScale}" r="${0.5 * patternDensity}" fill="${patternColor}" /><circle cx="${14 * patternScale}" cy="${2 * patternScale}" r="${0.5 * patternDensity}" fill="${patternColor}" /><circle cx="${10 * patternScale}" cy="${16 * patternScale}" r="${0.5 * patternDensity}" fill="${patternColor}" /><circle cx="${18 * patternScale}" cy="${12 * patternScale}" r="${0.5 * patternDensity}" fill="${patternColor}" />` : ''}
      </pattern>
    </defs>` : '';
    
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">${patternSvg}<g transform="rotate(${rotation}, 200, 200)"><path d="${formaPath}" fill="${color}" />${patternType !== 'solid' ? `<path d="${formaPath}" fill="url(#${patternId})" />` : ''}</g></svg>`;
  }, [formaPath, color, patternType, patternScale, patternRotation, patternDensity, patternColor, patternId, rotation]);

  const downloadSvg = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forma-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 800;
      canvas.height = 800;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 800, 800);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `forma-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareForma = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Minha Forma',
        text: 'Confira esta forma que criei com o Molda Forma!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyToClipboard();
      alert('Link copiado!');
    }
  };

  const randomizeMoldar = () => {
    // Randomize Rotation
    setRotation(Math.floor(Math.random() * 360));

    // Randomize Shape Parameters
    if (mode === 'organic') {
      setComplexity(Math.floor(Math.random() * 8) + 1);
      setContrast(Math.floor(Math.random() * 8) + 1);
      setSeed(Math.random());
    } else {
      const types: ('star' | 'polygon')[] = ['star', 'polygon'];
      setGeometricType(types[Math.floor(Math.random() * types.length)]);
      setSides(Math.floor(Math.random() * 17) + 3); // 3 to 20
      setInnerRadius(0.1 + Math.random() * 0.8);
    }
  };

  const randomizePatternColor = () => {
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    setPatternColor(randomColor);
  };

  const randomizePattern = () => {
    // Randomize Pattern
    const patternTypes: PatternType[] = ['solid', 'stripes', 'dots', 'checkerboard', 'waves', 'noise'];
    const newPatternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    setPatternType(newPatternType);
    
    if (newPatternType !== 'solid') {
      setPatternScale(0.5 + Math.random() * 1.5);
      setPatternRotation(Math.floor(Math.random() * 24) * 15);
      setPatternDensity(0.5 + Math.random() * 2.5);
      const randomPatternColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      setPatternColor(randomPatternColor);
    }
  };

  const randomize = () => {
    // Randomize Main Color
    randomizeColor();
    randomizeMoldar();
    randomizePattern();
  };

  const randomizeColor = () => {
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    setColor(randomColor);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^#[0-9A-F]{0,6}$/i.test(val)) {
      setColor(val);
    }
  };

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300 ${isHighContrast ? 'bg-black text-white' : 'bg-[#0A0A0A] text-[#EDEDED]'}`}
      style={{ filter: colorBlindMode !== 'none' ? `url(#${colorBlindMode}-filter)` : 'none' }}
    >
      {/* Color Blindness Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
          <filter id="achromatopsia-filter">
            <feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white rotate-12 shadow-lg ${isHighContrast ? 'bg-white text-black' : 'bg-[#D81B60]'}`}>
            <Triangle size={20} fill="currentColor" />
          </div>
          <h1 className={`text-2xl font-black tracking-tighter uppercase italic ${isHighContrast ? 'text-white' : 'text-[#EDEDED]'}`}>Molda Forma</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className={`p-2 rounded-full border transition-all ${isHighContrast ? 'bg-white text-black border-white' : 'bg-[#141414] text-[#EDEDED] border-white/5 shadow-sm hover:bg-white/10'}`}
            title="Configurações de Acessibilidade"
          >
            <Settings size={20} />
          </button>

          {user ? (
            <div className={`flex items-center gap-3 pl-1 pr-4 py-1 rounded-full border shadow-sm ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}>
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              <span className="text-xs font-bold hidden sm:block">{user.displayName?.split(' ')[0]}</span>
              <button onClick={logout} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-full transition-colors" title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm text-xs font-bold transition-colors ${isHighContrast ? 'bg-white text-black border-white' : 'bg-[#141414] border-white/5 hover:bg-white/10'}`}
            >
              <LogIn size={14} />
              Entrar com Google
            </button>
          )}
        </div>
      </div>

      {/* AI Prompt Input */}
      <div className="w-full max-w-md mb-8 space-y-4">
        <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] text-center ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>
          Gerar forma com prompt
        </h2>
        
        <div className="relative group">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
            placeholder="Ex: forma circular verde com pontos pretos"
            className={`w-full h-14 rounded-2xl px-6 pr-14 shadow-xl border outline-none transition-all text-sm ${
              isHighContrast 
                ? 'bg-black border-white text-white placeholder:text-white/40 focus:bg-white/5' 
                : 'bg-[#141414] border-white/5 text-white placeholder:text-white/20 focus:bg-white/5'
            }`}
          />
          <button
            onClick={generateWithAI}
            disabled={isGenerating || !prompt.trim()}
            className={`absolute right-2 top-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isHighContrast 
                ? 'bg-white text-black disabled:opacity-30' 
                : 'bg-[#D81B60] text-white hover:bg-[#AD1457] disabled:bg-white/10'
            }`}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          </button>
        </div>

        <div className={`flex p-1 rounded-2xl shadow-sm border ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}>
          <button
            onClick={() => setMode('organic')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-all ${
              mode === 'organic' 
                ? (isHighContrast ? 'bg-white text-black' : 'bg-[#D81B60] text-white shadow-md') 
                : (isHighContrast ? 'text-white/40 hover:text-white' : 'text-white/40 hover:text-white')
            }`}
          >
            <Waves size={14} /> Orgânico
          </button>
          <button
            onClick={() => setMode('geometric')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-all ${
              mode === 'geometric' 
                ? (isHighContrast ? 'bg-white text-black' : 'bg-[#D81B60] text-white shadow-md') 
                : (isHighContrast ? 'text-white/40 hover:text-white' : 'text-white/40 hover:text-white')
            }`}
          >
            <Shapes size={14} /> Geométrico
          </button>
        </div>

        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`border p-4 rounded-2xl flex items-center justify-between gap-4 ${
                isHighContrast ? 'bg-black border-white text-white' : 'bg-[#D81B60]/5 border-[#D81B60]/20'
              }`}
            >
              <div className={`flex items-center gap-3 ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>
                <AlertCircle size={18} />
                <p className="text-xs font-bold">{suggestion.text}</p>
              </div>
              <button
                onClick={() => {
                  setMode(suggestion.targetMode);
                  setSuggestion(null);
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  isHighContrast ? 'bg-white text-black' : 'bg-[#D81B60] text-white hover:bg-[#AD1457]'
                }`}
              >
                Trocar Agora
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Forma Display */}
      <div className={`relative w-full max-w-md aspect-square flex items-center justify-center rounded-3xl shadow-2xl border mb-12 overflow-visible transition-all ${
        isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'
      }`}>
        {/* Share Button */}
        <button 
          onClick={shareForma}
          className={`absolute top-4 right-4 transition-colors flex items-center gap-1 text-xs font-medium ${
            isHighContrast ? 'text-white/60 hover:text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <Share2 size={14} />
          Compartilhar
        </button>

        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl">
          <defs>
            {patternElement}
          </defs>
          <g transform={`rotate(${rotation}, 200, 200)`}>
            {/* Background Color Layer */}
            <motion.path
              d={formaPath}
              fill={color}
              animate={{ d: formaPath }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            />
            {/* Pattern Layer */}
            {patternType !== 'solid' && (
              <motion.path
                d={formaPath}
                fill={`url(#${patternId})`}
                animate={{ d: formaPath }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            )}
          </g>
        </svg>

        {/* Action Buttons - Positioned at the bottom middle of the square */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 flex items-center gap-4">
          {/* Randomize Shape Button */}
          <button
            onClick={randomize}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:rotate-12 shadow-xl ${
              isHighContrast ? 'bg-white text-black shadow-white/10' : 'bg-[#D81B60] text-white shadow-[#D81B60]/20'
            }`}
            title="Aleatorizar Forma"
          >
            <Dices size={24} />
            <div className={`absolute -inset-1 rounded-full border scale-110 group-hover:scale-125 transition-transform ${
              isHighContrast ? 'border-white/20' : 'border-[#D81B60]/20'
            }`} />
          </button>
        </div>
      </div>

      {/* Controls Container - Moldar */}
      <div className="w-full max-w-md space-y-4">
        <div className={`p-8 rounded-3xl border shadow-sm space-y-6 ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}>
          <div className="flex items-center justify-between">
            <div className="w-8" /> {/* Spacer */}
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] text-center ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Moldar</h3>
            <button 
              onClick={randomizeMoldar}
              className={`p-1.5 rounded-lg transition-colors ${isHighContrast ? 'hover:bg-white/20 text-white' : 'hover:bg-white/5 text-[#D81B60]'}`}
              title="Aleatorizar Moldagem"
            >
              <Dices size={16} />
            </button>
          </div>
          
          {/* Sliders / Controls */}
          <div className="space-y-8">
          {mode === 'organic' ? (
            <>
              {/* Complexity Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Triangle size={18} className={isHighContrast ? 'text-white' : 'text-white/80'} />
                  <Pentagon size={18} className={isHighContrast ? 'text-white' : 'text-white/80'} />
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={complexity}
                  onChange={(e) => setComplexity(parseInt(e.target.value))}
                  className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
                />
              </div>

              {/* Contrast Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Circle size={18} className={isHighContrast ? 'text-white' : 'text-white/80'} />
                  <Cloud size={18} className={isHighContrast ? 'text-white' : 'text-white/80'} />
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
                />
              </div>
            </>
          ) : (
            <>
              {/* Geometric Type Selector */}
              <div className="flex gap-2">
                {(['polygon', 'star'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setGeometricType(t)}
                    className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                      geometricType === t 
                        ? (isHighContrast ? 'border-white bg-white/20 text-white' : 'border-[#D81B60] bg-[#D81B60]/5 text-[#D81B60]') 
                        : (isHighContrast ? 'border-white/10 text-white/40 hover:border-white' : 'border-white/5 text-white/40 hover:border-white/10')
                    }`}
                  >
                    {t === 'polygon' ? 'Polígono' : 'Estrela'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Lados / Pontas</span>
                  <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{sides}</span>
                </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="1"
                    value={sides}
                    onChange={(e) => setSides(parseInt(e.target.value))}
                    className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
                  />
                </div>

              {geometricType === 'star' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Raio Interno</span>
                    <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{Math.round(innerRadius * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={innerRadius}
                    onChange={(e) => setInnerRadius(parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
                  />
                </div>
              )}
            </>
          )}

          {/* Global Rotation Slider */}
          <div className={`space-y-3 pt-4 border-t ${isHighContrast ? 'border-white/20' : 'border-white/5'}`}>
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>
                <RotateCw size={12} /> Rotação da Forma
              </span>
              <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{rotation}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
            />
          </div>

          {/* Color Selection */}
          <div className={`space-y-4 pt-4 border-t ${isHighContrast ? 'border-white/20' : 'border-white/5'}`}>
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Cor da Forma</span>
              <button 
                onClick={randomizeColor}
                className={`p-1.5 rounded-lg transition-colors ${
                  isHighContrast ? 'hover:bg-white/20 text-white' : 'hover:bg-white/5 text-[#D81B60]'
                }`}
                title="Cor Aleatória"
              >
                <Dices size={16} />
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={color}
                onChange={handleHexChange}
                className={`w-full h-10 rounded-xl px-4 font-mono text-xs border-2 outline-none transition-all ${
                  isHighContrast 
                    ? 'bg-white/10 border-white text-white' 
                    : 'bg-white/5 border-transparent focus:border-[#D81B60] text-white'
                }`}
                placeholder="#000000"
              />
              <div className="absolute right-1 flex items-center">
                <button
                  onClick={() => setShowPalette(!showPalette)}
                  className={`w-8 h-8 rounded-full border shadow-sm ${isHighContrast ? 'border-white' : 'border-white/10'}`}
                  style={{ backgroundColor: color }}
                />
              </div>
              
              <AnimatePresence>
                {showPalette && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`absolute bottom-full right-0 mb-2 p-2 rounded-xl shadow-xl border grid grid-cols-5 gap-1 z-50 ${
                      isHighContrast ? 'bg-black border-white' : 'bg-white border-black/5'
                    }`}
                  >
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setColor(c);
                          setShowPalette(false);
                        }}
                        className={`w-5 h-5 rounded-full border ${isHighContrast ? 'border-white' : 'border-black/5'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          </div>
        </div>

      {/* Patterns Card */}
      <div className={`p-8 rounded-3xl border shadow-sm space-y-6 ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}>
        <div className="flex items-center justify-between">
          <div className="w-8" /> {/* Spacer */}
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] text-center ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Padrões e Texturas</h3>
          <button 
            onClick={randomizePattern}
            className={`p-1.5 rounded-lg transition-colors ${isHighContrast ? 'hover:bg-white/20 text-white' : 'hover:bg-white/5 text-[#D81B60]'}`}
            title="Aleatorizar Padrão"
          >
            <Dices size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {(['solid', 'stripes', 'dots', 'checkerboard', 'waves', 'noise'] as PatternType[]).map((t) => (
            <button
              key={t}
              onClick={() => setPatternType(t)}
              className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                patternType === t 
                  ? (isHighContrast ? 'border-white bg-white/20 text-white' : 'border-[#D81B60] bg-[#D81B60]/5 text-[#D81B60]') 
                  : (isHighContrast ? 'border-white/10 text-white/40 hover:border-white' : 'border-white/5 text-white/40 hover:border-white/10')
              }`}
            >
              {t === 'solid' ? 'Sólido' : t === 'stripes' ? 'Listras' : t === 'dots' ? 'Pontos' : t === 'checkerboard' ? 'Xadrez' : t === 'waves' ? 'Ondas' : 'Ruído'}
            </button>
          ))}
        </div>

        {patternType !== 'solid' && (
          <div className={`space-y-6 pt-4 border-t ${isHighContrast ? 'border-white/20' : 'border-black/5'}`}>
            {/* Pattern Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${isHighContrast ? 'text-white/60' : 'text-gray-400'}`}>Cor do Padrão</label>
                <button 
                  onClick={randomizePatternColor}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isHighContrast ? 'hover:bg-white/20 text-white' : 'hover:bg-black/5 text-[#D81B60]'
                  }`}
                  title="Cor do Padrão Aleatória"
                >
                  <Dices size={16} />
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={patternColor}
                  onChange={(e) => setPatternColor(e.target.value)}
                  className={`w-full h-10 rounded-xl px-4 font-mono text-xs border-2 outline-none transition-all ${
                    isHighContrast ? 'bg-white/10 border-white text-white' : 'bg-white/5 border-transparent focus:border-[#D81B60] text-white'
                  }`}
                />
                <div className="absolute right-1 flex items-center">
                  <button
                    onClick={() => setShowPatternPalette(!showPatternPalette)}
                    className={`w-8 h-8 rounded-full border shadow-sm ${isHighContrast ? 'border-white' : 'border-white/10'}`}
                    style={{ backgroundColor: patternColor }}
                  />
                </div>
                <AnimatePresence>
                  {showPatternPalette && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`absolute bottom-full right-0 mb-2 p-2 rounded-xl shadow-xl border grid grid-cols-5 gap-1 z-50 ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}
                    >
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setPatternColor(c);
                            setShowPatternPalette(false);
                          }}
                          className={`w-5 h-5 rounded-full border ${isHighContrast ? 'border-white' : 'border-black/5'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Scale Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isHighContrast ? 'text-white/60' : 'text-gray-400'}`}>
                  <Maximize size={10} /> Escala
                </span>
                <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{Math.round(patternScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.1"
                value={patternScale}
                onChange={(e) => setPatternScale(parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
              />
            </div>

            {/* Rotation Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isHighContrast ? 'text-white/60' : 'text-gray-400'}`}>
                  <RotateCw size={10} /> Rotação
                </span>
                <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{patternRotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={patternRotation}
                onChange={(e) => setPatternRotation(parseInt(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
              />
            </div>

            {/* Density Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isHighContrast ? 'text-white/60' : 'text-gray-400'}`}>
                  <Layers size={10} /> Densidade
                </span>
                <span className={`text-[10px] font-bold ${isHighContrast ? 'text-white' : 'text-[#D81B60]'}`}>{Math.round(patternDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={patternDensity}
                onChange={(e) => setPatternDensity(parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isHighContrast ? 'bg-white/20 accent-white' : 'bg-white/10 accent-[#D81B60]'}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Options Card */}
        <div className={`p-8 rounded-3xl border shadow-sm space-y-6 ${isHighContrast ? 'bg-black border-white' : 'bg-[#141414] border-white/5'}`}>
          {/* Firebase Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={saveForma}
              disabled={isSaving}
              className={`flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${
                isHighContrast ? 'bg-white text-black' : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {isSaving ? <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isHighContrast ? 'border-black/30 border-t-black' : 'border-black/30 border-t-black'}`} /> : <Save size={18} />}
              Salvar
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 ${
                isHighContrast ? 'bg-black border-white text-white hover:bg-white/10' : 'bg-transparent border-white/10 text-white hover:bg-white/5'
              }`}
            >
              <Bookmark size={18} />
              Coleção ({savedFormas.length})
            </button>
          </div>

          {/* Action Buttons (Download & Copy) */}
          <div className={`grid grid-cols-3 gap-2 pt-4 border-t ${isHighContrast ? 'border-white/20' : 'border-white/5'}`}>
            <button
              onClick={downloadSvg}
              className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl border-2 font-bold text-[10px] transition-all active:scale-95 ${
                isHighContrast ? 'bg-black border-white text-white hover:bg-white/10' : 'bg-transparent border-white/10 text-white hover:bg-white/5'
              }`}
            >
              <Download size={16} />
              SVG
            </button>
            <button
              onClick={downloadPng}
              className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl border-2 font-bold text-[10px] transition-all active:scale-95 ${
                isHighContrast ? 'bg-black border-white text-white hover:bg-white/10' : 'bg-transparent border-white/10 text-white hover:bg-white/5'
              }`}
            >
              <Download size={16} />
              PNG
            </button>
            <button
              onClick={() => setShowCodeModal(true)}
              className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl border-2 font-bold text-[10px] transition-all active:scale-95 ${
                isHighContrast ? 'bg-black border-white text-white hover:bg-white/10' : 'bg-transparent border-white/10 text-white hover:bg-white/5'
              }`}
            >
              <Code size={16} />
              Código
            </button>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${isHighContrast ? 'bg-black text-white border-2 border-white' : 'bg-[#141414] text-[#EDEDED]'}`}
            >
              <div className={`flex items-center justify-between p-6 border-b ${isHighContrast ? 'border-white' : 'border-white/5'}`}>
                <h3 className="text-lg font-bold">Código SVG</h3>
                <button onClick={() => setShowCodeModal(false)} className={`p-2 rounded-full transition-colors ${isHighContrast ? 'hover:bg-white/20' : 'hover:bg-white/5'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className={`p-4 rounded-2xl font-mono text-xs break-all max-h-48 overflow-y-auto border ${isHighContrast ? 'bg-white/10 border-white' : 'bg-white/5 border-white/5'}`}>
                  {svgCode}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold transition-all active:scale-95 ${
                    isHighContrast ? 'bg-white text-black' : 'bg-[#D81B60] text-white hover:bg-[#AD1457]'
                  }`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copiado!' : 'Copiar para Área de Transferência'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${isHighContrast ? 'bg-black text-white border-2 border-white' : 'bg-[#141414] text-[#EDEDED]'}`}
            >
              <div className={`flex items-center justify-between p-6 border-b ${isHighContrast ? 'border-white' : 'border-white/5'}`}>
                <h3 className="text-lg font-bold">Minha Coleção</h3>
                <button onClick={() => setShowHistoryModal(false)} className={`p-2 rounded-full transition-colors ${isHighContrast ? 'hover:bg-white/20' : 'hover:bg-white/5'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
                {savedFormas.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-white/40">
                    <Cloud size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma forma salva ainda.</p>
                  </div>
                ) : (
                  savedFormas.map((b) => (
                    <div key={b.id} className={`group relative rounded-2xl p-4 transition-all hover:shadow-lg border ${isHighContrast ? 'bg-white/5 border-white/20 hover:border-white' : 'bg-white/5 border-transparent hover:border-[#D81B60]/20'}`}>
                      <div className="aspect-square mb-3 cursor-pointer" onClick={() => loadForma(b)}>
                        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-md">
                          <path d={b.path} fill={b.color} />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider truncate pr-2 ${isHighContrast ? 'text-white/60' : 'text-gray-400'}`}>{b.name}</span>
                        <button 
                          onClick={() => deleteForma(b.id)}
                          className={`p-1.5 transition-colors ${isHighContrast ? 'text-white/40 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isHighContrast ? 'bg-black text-white border-2 border-white' : 'bg-[#141414] text-[#EDEDED]'}`}
            >
              <div className={`flex items-center justify-between p-6 border-b ${isHighContrast ? 'border-white' : 'border-white/5'}`}>
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-[#D81B60]" />
                  <h3 className="text-lg font-bold">Acessibilidade</h3>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className={`p-2 rounded-full transition-colors ${isHighContrast ? 'hover:bg-white/20' : 'hover:bg-white/5'}`}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* High Contrast Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold">Alto Contraste</p>
                    <p className={`text-xs ${isHighContrast ? 'text-white/60' : 'text-white/40'}`}>Cores mais nítidas e vibrantes</p>
                  </div>
                  <button 
                    onClick={() => setIsHighContrast(!isHighContrast)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isHighContrast ? 'bg-white' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isHighContrast ? 'left-7 bg-black' : 'left-1 bg-white'}`} />
                  </button>
                </div>

                {/* Color Blindness Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-[#D81B60]" />
                    <p className="font-bold">Modo Daltonismo</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'none', label: 'Nenhum' },
                      { id: 'protanopia', label: 'Protanopia (Vermelho)' },
                      { id: 'deuteranopia', label: 'Deuteranopia (Verde)' },
                      { id: 'tritanopia', label: 'Tritanopia (Azul)' },
                      { id: 'achromatopsia', label: 'Acromatopsia (Monocromático)' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setColorBlindMode(mode.id as any)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
                          colorBlindMode === mode.id 
                            ? (isHighContrast ? 'border-white bg-white/20' : 'border-[#D81B60] bg-[#D81B60]/5 text-[#D81B60]') 
                            : (isHighContrast ? 'border-white/20 hover:border-white' : 'border-white/5 hover:border-white/10')
                        }`}
                      >
                        {mode.label}
                        {colorBlindMode === mode.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
