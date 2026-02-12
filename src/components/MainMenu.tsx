import React, { useState } from 'react';

interface MainMenuProps {
    onSelectMode: (mode: 'flag-to-map' | 'name-to-flag' | 'map-to-flag') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <h1 className="text-5xl font-bold mb-8 text-white drop-shadow-lg">
                🌏 Globe Master <span className="text-blue-300">Flag</span> Game
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <button
                    onClick={() => onSelectMode('flag-to-map')}
                    className="glass-panel p-8 text-xl font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-4 py-12"
                >
                    <span className="text-4xl">🚩 ➡ 🗺️</span>
                    Flag to Map
                    <p className="text-sm font-normal opacity-80 mt-2">Locate the country based on its flag</p>
                </button>

                <button
                    onClick={() => onSelectMode('name-to-flag')}
                    className="glass-panel p-8 text-xl font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-4 py-12"
                >
                    <span className="text-4xl">📛 ➡ 🚩</span>
                    Name to Flag
                    <p className="text-sm font-normal opacity-80 mt-2">Pick the right flag for the country name</p>
                </button>

                <button
                    onClick={() => onSelectMode('map-to-flag')}
                    className="glass-panel p-8 text-xl font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-4 py-12"
                >
                    <span className="text-4xl">🗺️ ➡ 🚩</span>
                    Map to Flag
                    <p className="text-sm font-normal opacity-80 mt-2">Identify the flag of the highlighted country</p>
                </button>
            </div>
        </div>
    );
};

export default MainMenu;
