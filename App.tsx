import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const GRID_SIZE = 10; // 10x10 Grid
const TILE_SIZE = 40; // Pixels (roughly, handled by CSS grid)

// Types
type Position = { x: number; y: number };
type Scene = 'campus' | 'building';
type BombStatus = 'active' | 'exploded' | 'diffused';

interface Entity {
  id: number;
  x: number;
  y: number;
}

interface Bomb extends Entity {
  scene: Scene;
  status: BombStatus;
}

interface Teacher extends Entity {
  scene: Scene;
  direction: 'left' | 'right';
}

interface Manhole extends Entity {
  scene: Scene;
}

// Initial Data
const BUILDING_ENTRANCE: Position = { x: 7, y: 2 }; // Where the door is on Campus
const BUILDING_EXIT: Position = { x: 5, y: 9 };     // Where the door is inside Building

export default function App() {
  // --- State ---
  const [scene, setScene] = useState<Scene>('campus');
  const [playerPos, setPlayerPos] = useState<Position>({ x: 2, y: 8 });
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [manholes, setManholes] = useState<Manhole[]>([]);
  const [selectedBombId, setSelectedBombId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Welcome to 3D Campus!");

  // --- Initialization ---
  useEffect(() => {
    // Generate Random Bombs
    const initialBombs: Bomb[] = [];
    let idCounter = 1;
    
    // Campus Bombs
    for (let i = 0; i < 6; i++) {
      initialBombs.push({
        id: idCounter++,
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        scene: 'campus',
        status: 'active'
      });
    }
    // Building Bombs
    for (let i = 0; i < 4; i++) {
      initialBombs.push({
        id: idCounter++,
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        scene: 'building',
        status: 'active'
      });
    }
    setBombs(initialBombs);

    // Generate Teachers
    const initialTeachers: Teacher[] = [
      { id: 101, x: 4, y: 4, scene: 'campus', direction: 'right' },
      { id: 102, x: 8, y: 5, scene: 'campus', direction: 'left' },
      { id: 103, x: 2, y: 2, scene: 'building', direction: 'right' },
    ];
    setTeachers(initialTeachers);

    // Generate Manholes (Open Wells)
    const initialManholes: Manhole[] = [];
    for (let i = 0; i < 4; i++) {
        // Ensure we don't block the door or spawn point too aggressively
        let mx, my;
        do {
            mx = Math.floor(Math.random() * GRID_SIZE);
            my = Math.floor(Math.random() * GRID_SIZE);
        } while ((mx === 2 && my === 8) || (mx === BUILDING_ENTRANCE.x && my === BUILDING_ENTRANCE.y));

        initialManholes.push({
            id: idCounter++,
            x: mx,
            y: my,
            scene: 'campus' // Manholes mostly outside
        });
    }
    setManholes(initialManholes);

  }, []);

  // --- Logic ---

  // Check interactions (Bomb & Teacher & Manhole)
  useEffect(() => {
    // 1. Check Bomb
    const nearbyBomb = bombs.find(b => 
      b.scene === scene && 
      b.status === 'active' && 
      b.x === playerPos.x && 
      b.y === playerPos.y
    );

    if (nearbyBomb) {
      setSelectedBombId(nearbyBomb.id);
      setMessage("BOMB UNDERFOOT! Action required.");
    } else {
      setSelectedBombId(null);
    }

    // 2. Check Teacher
    const nearbyTeacher = teachers.find(t => 
      t.scene === scene && 
      t.x === playerPos.x && 
      t.y === playerPos.y
    );
    
    if (nearbyTeacher) {
      setScore(s => Math.max(0, s - 50));
      setMessage("CAUGHT BY TEACHER! -50 Pts");
      // Push player back slightly to avoid infinite loop (Simplified: just notify for now)
    }

    // 3. Check Manhole
    const fellInHole = manholes.find(m => 
        m.scene === scene && m.x === playerPos.x && m.y === playerPos.y
    );

    if (fellInHole) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setScore(s => Math.max(0, s - 200));
        setMessage("FELL INTO MOVING HOLE! -200 Pts");
        // Respawn logic (teleport to start)
        setTimeout(() => {
             setPlayerPos({ x: 0, y: 0 });
        }, 200);
    }

  }, [playerPos, scene, bombs, teachers, manholes]);

  // Teacher AI Movement
  useEffect(() => {
    const interval = setInterval(() => {
      setTeachers(prev => prev.map(t => {
        if (Math.random() > 0.6) return t; // 40% chance to stand still

        const moveX = Math.random() > 0.5 ? 1 : -1;
        const moveY = Math.random() > 0.5 ? 1 : -1;
        const axis = Math.random() > 0.5 ? 'x' : 'y'; // Move along one axis at a time
        
        let newX = t.x;
        let newY = t.y;

        if (axis === 'x') newX = Math.min(Math.max(t.x + moveX, 0), GRID_SIZE - 1);
        else newY = Math.min(Math.max(t.y + moveY, 0), GRID_SIZE - 1);

        return {
          ...t,
          x: newX,
          y: newY,
          direction: newX > t.x ? 'right' : (newX < t.x ? 'left' : t.direction)
        };
      }));
    }, 1500); // Move every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  // Manhole AI Movement (Moving Hazards)
  useEffect(() => {
    const interval = setInterval(() => {
      setManholes(prev => prev.map(m => {
        // 50% chance to move each tick
        if (Math.random() > 0.5) return m;

        const moveX = Math.random() > 0.5 ? 1 : -1;
        const moveY = Math.random() > 0.5 ? 1 : -1;
        const axis = Math.random() > 0.5 ? 'x' : 'y';
        
        let newX = m.x;
        let newY = m.y;

        if (axis === 'x') newX = Math.min(Math.max(m.x + moveX, 0), GRID_SIZE - 1);
        else newY = Math.min(Math.max(m.y + moveY, 0), GRID_SIZE - 1);

        // Safety: Don't move onto the School Entrance (too cruel)
        if (newX === BUILDING_ENTRANCE.x && newY === BUILDING_ENTRANCE.y) return m;

        return { ...m, x: newX, y: newY };
      }));
    }, 2000); // Move every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Movement Handler
  const movePlayer = useCallback((dx: number, dy: number) => {
    setPlayerPos(prev => {
      const newX = Math.min(Math.max(prev.x + dx, 0), GRID_SIZE - 1);
      const newY = Math.min(Math.max(prev.y + dy, 0), GRID_SIZE - 1);
      
      // Building collision (simple block) logic
      if (scene === 'campus') {
         // Prevent walking INTO the 3D building walls (except door)
         if (newX === BUILDING_ENTRANCE.x && newY === BUILDING_ENTRANCE.y) return { x: newX, y: newY }; // Allow door
         if (newX >= 6 && newX <= 8 && newY >= 1 && newY <= 2) return prev; // Building footprint
      }

      return { x: newX, y: newY };
    });
    setMessage(""); // Clear old messages on move
  }, [scene]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp': case 'w': movePlayer(0, -1); break;
        case 'ArrowDown': case 's': movePlayer(0, 1); break;
        case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
        case 'ArrowRight': case 'd': movePlayer(1, 0); break;
        case 'Enter': case ' ': handleEnterBuilding(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, playerPos, scene]);

  // Actions
  const handleEnterBuilding = () => {
    if (scene === 'campus') {
      if (playerPos.x === BUILDING_ENTRANCE.x && playerPos.y === BUILDING_ENTRANCE.y) {
        setScene('building');
        setPlayerPos({ x: 5, y: 8 }); 
        setMessage("Entered Teaching Building");
      }
    } else {
      if (playerPos.x === BUILDING_EXIT.x && playerPos.y === BUILDING_EXIT.y) {
        setScene('campus');
        setPlayerPos({ x: 7, y: 3 }); // Just outside door
        setMessage("Returned to Campus");
      }
    }
  };

  const handleTrashBomb = () => {
    if (selectedBombId === null) return;
    
    setBombs(prev => prev.map(b => 
      b.id === selectedBombId ? { ...b, status: 'diffused' } : b
    ));
    setScore(s => s + 100);
    setMessage("Bomb Defused! +100");
  };

  const handleDetonateBomb = () => {
    if (selectedBombId === null) return;

    setBombs(prev => prev.map(b => 
      b.id === selectedBombId ? { ...b, status: 'exploded' } : b
    ));
    if (navigator.vibrate) navigator.vibrate(200);
    setMessage("BOOM! Campus property damage.");
    
    setTimeout(() => {
        setBombs(prev => prev.filter(b => b.id !== selectedBombId));
    }, 1000);
  };

  const isDoor = (x: number, y: number) => {
    if (scene === 'campus') return x === BUILDING_ENTRANCE.x && y === BUILDING_ENTRANCE.y;
    if (scene === 'building') return x === BUILDING_EXIT.x && y === BUILDING_EXIT.y;
    return false;
  };

  // --- 3D Helper Styles ---
  // The tilt angle for the board
  const BOARD_TILT = "perspective(800px) rotateX(40deg)";
  // The counter-tilt for entities so they stand up
  const ENTITY_STAND = "rotateX(-40deg) translateY(-25%)";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a1a] p-4 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <div className="mb-2 text-center z-50">
        <h1 className="text-yellow-400 text-xl font-bold tracking-widest drop-shadow-md font-['Press_Start_2P']">CAMPUS SWEEPER 3D</h1>
        <div className="flex justify-center gap-4 text-xs font-bold mt-2">
          <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-600 text-white shadow-lg">Score: <span className="text-green-400">{score}</span></span>
          <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-600 text-white shadow-lg">Zone: <span className="text-blue-400 uppercase">{scene}</span></span>
        </div>
        <div className="h-6 mt-1 text-xs text-orange-300 font-bold animate-pulse">
           {message}
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="relative w-[340px] h-[340px] md:w-[400px] md:h-[400px]">
        
        {/* The 3D World Stage */}
        <div 
            className="w-full h-full relative transition-transform duration-700 ease-in-out"
            style={{ 
                transform: BOARD_TILT,
                transformStyle: 'preserve-3d',
            }}
        >
            {/* Ground Plane */}
            <div className={`absolute inset-0 w-full h-full shadow-2xl rounded-xl border-4 border-[#0f172a]
                ${scene === 'campus' 
                    ? 'bg-[#4ade80] bg-[linear-gradient(45deg,#22c55e_25%,transparent_25%,transparent_75%,#22c55e_75%,#22c55e),linear-gradient(45deg,#22c55e_25%,transparent_25%,transparent_75%,#22c55e_75%,#22c55e)] bg-[length:40px_40px]' 
                    : 'bg-[#fbbf24] bg-[linear-gradient(45deg,#d97706_25%,transparent_25%,transparent_75%,#d97706_75%,#d97706),linear-gradient(45deg,#d97706_25%,transparent_25%,transparent_75%,#d97706_75%,#d97706)] bg-[length:40px_40px]'
                }`}
                style={{ 
                   transform: 'translateZ(0px)',
                   boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}
            />

            {/* --- 3D Static Objects --- */}

            {/* Campus Building (Only in Campus scene) */}
            {scene === 'campus' && (
                <div className="absolute transition-all duration-300"
                     style={{
                         left: '60%', top: '10%', width: '30%', height: '20%',
                         transformStyle: 'preserve-3d',
                         transform: 'translateZ(0)',
                         zIndex: 25 // Base Z-index
                     }}
                >
                    {/* Front Face */}
                    <div className="absolute inset-0 bg-stone-300 border-2 border-stone-500 flex flex-col items-center justify-end"
                         style={{ transform: 'rotateX(-90deg) translateZ(20px) translateY(20px)', height: '60px', top: '-60px' }}>
                        <div className="w-full text-center text-[8px] text-stone-600 bg-stone-100 py-1">SCHOOL</div>
                        <div className="flex gap-2 mb-1">
                            <div className="w-4 h-6 bg-blue-300 border border-blue-400"></div>
                            <div className="w-4 h-6 bg-blue-300 border border-blue-400"></div>
                        </div>
                    </div>
                    {/* Roof */}
                    <div className="absolute inset-0 bg-red-800 border-2 border-red-900"
                         style={{ transform: 'translateZ(60px)' }}></div>
                </div>
            )}

            {/* Dynamic Grid Items (Entities) */}
            {/* We map entities manually to ensure Z-index works based on Y position (depth) */}

            {/* 1. Manholes (Floor Level Hazards) - NOW MOVING */}
            {manholes.filter(m => m.scene === scene).map(m => (
                <div key={m.id}
                     className="absolute w-[10%] h-[10%] flex items-center justify-center pointer-events-none transition-all duration-1000 ease-in-out"
                     style={{ 
                         left: `${m.x * 10}%`, top: `${m.y * 10}%`,
                         transform: 'translateZ(1px)', // Flat on ground
                         zIndex: 2 
                     }}
                >
                     <div className="text-3xl opacity-80 filter grayscale">🕳️</div>
                </div>
            ))}

            {/* 2. Door Highlight (Floor level) */}
            <div 
                className="absolute w-[10%] h-[10%] flex justify-center items-center"
                style={{
                    left: `${(scene === 'campus' ? BUILDING_ENTRANCE.x : BUILDING_EXIT.x) * 10}%`,
                    top: `${(scene === 'campus' ? BUILDING_ENTRANCE.y : BUILDING_EXIT.y) * 10}%`,
                    transform: 'translateZ(1px)', // Just above floor
                    zIndex: 1
                }}
            >
                <div className="w-full h-full bg-blue-500/40 animate-pulse border-2 border-blue-400 rounded-full"></div>
            </div>

            {/* 3. Bombs */}
            {bombs.filter(b => b.scene === scene).map(bomb => {
                if (bomb.status === 'diffused') return null;
                const isExploding = bomb.status === 'exploded';
                const isSelected = selectedBombId === bomb.id;
                // Z-index based on Y ensures it appears in front/behind correctly
                const zIndex = bomb.y * 10 + 5; 

                return (
                    <div key={bomb.id}
                        className="absolute w-[10%] h-[10%] flex items-center justify-center pointer-events-none"
                        style={{ left: `${bomb.x * 10}%`, top: `${bomb.y * 10}%`, zIndex }}
                    >
                        {isExploding ? (
                            <span className="text-5xl animate-explode relative" style={{ transform: ENTITY_STAND }}>💥</span>
                        ) : (
                            <div className="relative transition-transform duration-300" style={{ transform: ENTITY_STAND }}>
                                <div className="text-3xl drop-shadow-xl filter grayscale-[0.2]">💣</div>
                                {isSelected && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-yellow-400/50 rounded-[100%] animate-ping"></div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* 4. Teachers */}
            {teachers.filter(t => t.scene === scene).map(t => (
                <div key={t.id}
                    className="absolute w-[10%] h-[10%] flex items-center justify-center transition-all duration-[1500ms] linear"
                    style={{ left: `${t.x * 10}%`, top: `${t.y * 10}%`, zIndex: t.y * 10 + 20 }}
                >
                    <div className="relative" style={{ transform: ENTITY_STAND }}>
                         {/* Shadow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/30 rounded-[100%] blur-[2px]"></div>
                        {/* Sprite */}
                        <div className={`text-4xl filter drop-shadow-lg transition-transform ${t.direction === 'left' ? '-scale-x-100' : ''}`}>
                            👨‍🏫
                        </div>
                    </div>
                </div>
            ))}

            {/* 5. Player */}
            <div 
                className="absolute w-[10%] h-[10%] flex items-center justify-center transition-all duration-200 ease-out"
                style={{ 
                    left: `${playerPos.x * 10}%`, 
                    top: `${playerPos.y * 10}%`, 
                    zIndex: playerPos.y * 10 + 30 // Player usually on top of things on same row
                }}
            >
                <div className="relative" style={{ transform: ENTITY_STAND }}>
                    {/* Shadow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/40 rounded-[100%] blur-[2px]"></div>
                    {/* Sprite */}
                    <div className="text-4xl filter drop-shadow-2xl">
                        🧑‍🎓
                    </div>
                    {/* Thought bubble if on bomb */}
                    {selectedBombId && (
                        <div className="absolute -top-8 -right-4 text-xl animate-bounce">❗</div>
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* Controls Container */}
      <div className="mt-8 w-full max-w-[400px] flex flex-col gap-4 z-50">
        
        {/* Action Buttons */}
        <div className="flex justify-between gap-4 h-14">
             <button 
                onClick={handleTrashBomb}
                disabled={!selectedBombId}
                className={`flex-1 rounded-2xl flex items-center justify-center gap-2 border-b-4 transition-all active:border-b-0 active:translate-y-1 shadow-xl
                    ${selectedBombId 
                        ? 'bg-green-500 border-green-700 text-white' 
                        : 'bg-gray-700 border-gray-900 text-gray-500'}
                `}
             >
                 <span className="text-xl">🗑️</span>
                 <span className="text-xs font-bold font-['Press_Start_2P']">CLEAN</span>
             </button>

             {/* Enter/Exit Context Button */}
             <button 
                onClick={handleEnterBuilding}
                disabled={!isDoor(playerPos.x, playerPos.y)}
                className={`flex-1 rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 shadow-xl
                    ${isDoor(playerPos.x, playerPos.y)
                        ? 'bg-blue-500 border-blue-700 text-white animate-pulse' 
                        : 'bg-gray-700 border-gray-900 text-gray-500'}
                `}
             >
                 <span className="text-2xl">🚪</span>
             </button>

             <button 
                onClick={handleDetonateBomb}
                disabled={!selectedBombId}
                className={`flex-1 rounded-2xl flex items-center justify-center gap-2 border-b-4 transition-all active:border-b-0 active:translate-y-1 shadow-xl
                    ${selectedBombId 
                        ? 'bg-red-500 border-red-700 text-white' 
                        : 'bg-gray-700 border-gray-900 text-gray-500'}
                `}
             >
                 <span className="text-xl">🧨</span>
                 <span className="text-xs font-bold font-['Press_Start_2P']">BOOM</span>
             </button>
        </div>

        {/* D-Pad */}
        <div className="grid grid-cols-3 gap-2 w-48 mx-auto mt-2">
            <div></div>
            <button 
                onPointerDown={(e) => { e.preventDefault(); movePlayer(0, -1); }}
                className="h-14 bg-gray-700 rounded-xl border-b-4 border-gray-900 active:border-b-0 active:bg-gray-600 active:translate-y-1 text-2xl shadow-lg"
            >⬆️</button>
            <div></div>
            
            <button 
                onPointerDown={(e) => { e.preventDefault(); movePlayer(-1, 0); }}
                className="h-14 bg-gray-700 rounded-xl border-b-4 border-gray-900 active:border-b-0 active:bg-gray-600 active:translate-y-1 text-2xl shadow-lg"
            >⬅️</button>
            <button 
                onPointerDown={(e) => { e.preventDefault(); movePlayer(0, 1); }}
                className="h-14 bg-gray-700 rounded-xl border-b-4 border-gray-900 active:border-b-0 active:bg-gray-600 active:translate-y-1 text-2xl shadow-lg"
            >⬇️</button>
            <button 
                onPointerDown={(e) => { e.preventDefault(); movePlayer(1, 0); }}
                className="h-14 bg-gray-700 rounded-xl border-b-4 border-gray-900 active:border-b-0 active:bg-gray-600 active:translate-y-1 text-2xl shadow-lg"
            >➡️</button>
        </div>
      </div>
    </div>
  );
}