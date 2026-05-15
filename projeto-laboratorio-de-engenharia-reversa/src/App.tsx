import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Triangle, 
  Pentagon, 
  Circle, 
  Sparkles, 
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASIC_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#64748b', // Gray
];

export default function App() {
  const [color, setColor] = useState('#6366f1');
  const [sides, setSides] = useState(3); // 3 to 5
  const [style, setStyle] = useState(0.5); // 0: Circular, 0.5: Regular, 1: Abstract
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close palette when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setShowPalette(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate shape path
  const pathData = useMemo(() => {
    const numPoints = 120;
    const radius = 75;
    const centerX = 100;
    const centerY = 100;
    const points: [number, number][] = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
      
      // 1. Circle Point (Perfectly round)
      const circleX = centerX + Math.cos(angle) * radius;
      const circleY = centerY + Math.sin(angle) * radius;

      // 2. Regular Polygon Point (Sharp)
      const s1 = Math.floor(sides);
      const s2 = Math.ceil(sides);
      const sWeight = sides - s1;

      const getPolyPoint = (numSides: number) => {
        const anglePerSide = (Math.PI * 2) / numSides;
        const currentSide = Math.floor(((angle + Math.PI / 2 + 0.0001) % (Math.PI * 2)) / anglePerSide);
        const t = ((angle + Math.PI / 2 + 0.0001) % anglePerSide) / anglePerSide;
        
        const a1 = currentSide * anglePerSide - Math.PI / 2;
        const a2 = (currentSide + 1) * anglePerSide - Math.PI / 2;
        
        const x1 = centerX + Math.cos(a1) * radius;
        const y1 = centerY + Math.sin(a1) * radius;
        const x2 = centerX + Math.cos(a2) * radius;
        const y2 = centerY + Math.sin(a2) * radius;
        
        return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
      };

      const p1 = getPolyPoint(s1);
      const p2 = getPolyPoint(s2);
      const polyX = p1[0] + (p2[0] - p1[0]) * sWeight;
      const polyY = p1[1] + (p2[1] - p1[1]) * sWeight;

      // 3. Abstract Point (Smooth noise)
      // We use multiple frequencies to make it "spread out" but keep it one piece
      const noise = 
        Math.sin(angle * 2) * 20 + 
        Math.cos(angle * 5) * 10 + 
        Math.sin(angle * 8) * 5;
      
      const abstractX = polyX + Math.cos(angle) * noise;
      const abstractY = polyY + Math.sin(angle) * noise;

      let finalX, finalY;

      if (style <= 0.5) {
        // From Circular (0) to Regular (0.5)
        // At style=0, we blend 70% with circle to get "rounded polygon"
        // At style=0.5, we are 100% regular polygon
        const t = style * 2; // 0 to 1
        const roundedX = circleX * 0.7 + polyX * 0.3;
        const roundedY = circleY * 0.7 + polyY * 0.3;
        
        finalX = roundedX + (polyX - roundedX) * t;
        finalY = roundedY + (polyY - roundedY) * t;
      } else {
        // From Regular (0.5) to Abstract (1)
        const t = (style - 0.5) * 2; // 0 to 1
        finalX = polyX + (abstractX - polyX) * t;
        finalY = polyY + (abstractY - polyY) * t;
      }

      points.push([finalX, finalY]);
    }

    return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
  }, [sides, style]);

  const handleHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.startsWith('#') && val.length <= 7) {
      setColor(val);
    } else if (!val.startsWith('#') && val.length <= 6) {
      setColor('#' + val);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-indigo-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Formador de Formas</h1>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">Personalize sua geometria</p>
        </header>

        {/* Shape Preview */}
        <div className="relative aspect-square w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center justify-center overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
          <svg viewBox="0 0 200 200" className="w-64 h-64 drop-shadow-2xl">
            <motion.path
              d={pathData}
              fill={color}
              animate={{ d: pathData, fill: color }}
              transition={{ 
                type: "spring", 
                stiffness: 60, 
                damping: 15,
                fill: { duration: 0.3 }
              }}
            />
          </svg>
          
          <button 
            onClick={() => { setSides(3); setStyle(0.5); setColor('#6366f1'); }}
            className="absolute bottom-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            title="Resetar"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-8 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          
          {/* Color Input */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Cor da Forma</label>
            <div className="relative group">
              <input
                type="text"
                value={color}
                onChange={handleHexChange}
                className="w-full h-14 pl-5 pr-14 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-mono text-lg font-medium shadow-sm group-hover:bg-gray-100/50"
                placeholder="#000000"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  onClick={() => setShowPalette(!showPalette)}
                  className="w-10 h-10 rounded-xl shadow-inner border-2 border-white transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <ChevronDown size={14} className={cn("text-white drop-shadow-md transition-transform", showPalette && "rotate-180")} />
                </button>
              </div>

              {/* Palette Popover */}
              <AnimatePresence>
                {showPalette && (
                  <motion.div
                    ref={paletteRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-3 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 w-48"
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {BASIC_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setShowPalette(false);
                          }}
                          className="w-6 h-6 rounded-full transition-transform hover:scale-125 active:scale-90 shadow-sm border border-gray-100"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Slider 1: Sides */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Complexidade</label>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {sides < 3.5 ? 'Triangular' : sides < 4.5 ? 'Quadrada' : sides < 5.5 ? 'Pentagonal' : 'Poligonal'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Triangle size={18} className={cn("transition-colors", sides < 3.5 ? "text-indigo-500" : "text-gray-300")} />
              <input
                type="range"
                min="3"
                max="8"
                step="0.05"
                value={sides}
                onChange={(e) => setSides(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <Pentagon size={18} className={cn("transition-colors", sides > 4.5 ? "text-indigo-500" : "text-gray-300")} />
            </div>
          </div>

          {/* Slider 2: Style */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Estilo</label>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {style < 0.3 ? 'Circular' : style > 0.7 ? 'Abstrato' : 'Regular'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Circle size={18} className={cn("transition-colors", style < 0.3 ? "text-indigo-500" : "text-gray-300")} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={style}
                onChange={(e) => setStyle(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <Sparkles size={18} className={cn("transition-colors", style > 0.7 ? "text-indigo-500" : "text-gray-300")} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
            Criado com precisão geométrica
          </p>
        </footer>
      </div>
    </div>
  );
}
