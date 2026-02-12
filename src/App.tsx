import React, { useEffect, useState } from 'react';
import type { Country, GameState } from './types';
import { CountryService } from './services/countryService';
import MainMenu from './components/MainMenu';
import MapBoard from './components/MapBoard';
import FlagCard from './components/FlagCard';
import L from 'leaflet';
import axios from 'axios';

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<any>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    round: 1,
    maxRounds: 5,
    mode: null,
    currentCountry: null,
    options: [],
    showResult: false,
    lastGuessCorrect: null
  });

  const [clickedLocation, setClickedLocation] = useState<L.LatLng | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await CountryService.getAllCountries();
      setCountries(data);

      try {
        // Fetch low-res GeoJSON for world
        const geoRes = await axios.get('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        setGeoData(geoRes.data);
      } catch (e) {
        console.error("Failed to load GeoJSON", e);
      }

      setLoading(false);
    };
    loadData();
  }, []);

  const startGame = (mode: GameState['mode']) => {
    startRound(1, 0, mode);
  };

  const startRound = (round: number, score: number, mode: GameState['mode']) => {
    // Basic filtering to ensure we have flags and good data
    const validCountries = countries.filter(c => c.flags && c.flags.svg);
    const randomCountries = CountryService.getRandomCountries(validCountries, 1);
    const target = randomCountries[0];

    let options: Country[] = [];
    if (mode === 'name-to-flag' || mode === 'map-to-flag') {
      options = CountryService.getOptions(target, validCountries, 4);
    }

    setGameState({
      score: score,
      round: round,
      maxRounds: 5,
      mode: mode,
      currentCountry: target,
      options: options,
      showResult: false,
      lastGuessCorrect: null
    });
    setClickedLocation(null);
  }

  const handleMapClick = (latlng: L.LatLng) => {
    if (gameState.mode !== 'flag-to-map' || !gameState.currentCountry || gameState.showResult) return;

    setClickedLocation(latlng);

    // Calculate distance logic
    const targetLat = gameState.currentCountry.latlng[0];
    const targetLng = gameState.currentCountry.latlng[1];
    const distanceComponent = latlng.distanceTo(L.latLng(targetLat, targetLng)); // meters

    // Heuristic: Base 500km, plus extra for large countries
    // Area is km2. 
    // If area is 1,000,000 km2 -> sqrt is 1000km. 
    const area = gameState.currentCountry.area || 0;
    const radiusEstimate = Math.sqrt(area / Math.PI) * 1000; // rough meters radius
    const threshold = Math.max(500000, radiusEstimate * 1.5);

    const isCorrect = distanceComponent < threshold;

    setGameState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 100 : prev.score,
      showResult: true,
      lastGuessCorrect: isCorrect
    }));
  };

  const handleOptionSelect = (selected: Country) => {
    if (gameState.showResult || !gameState.currentCountry) return;

    const isCorrect = selected.cca3 === gameState.currentCountry.cca3;

    setGameState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 100 : prev.score,
      showResult: true,
      lastGuessCorrect: isCorrect
    }));
  };

  const nextRound = () => {
    if (gameState.round >= gameState.maxRounds) {
      // End Game
      // Use simple alert for now, or a modal overlay
      // Reset to menu
      if (confirm(`Game Over! Score: ${gameState.score}\nPlay Again?`)) {
        setGameState(prev => ({ ...prev, mode: null }));
      } else {
        setGameState(prev => ({ ...prev, mode: null }));
      }
      return;
    }
    startRound(gameState.round + 1, gameState.score, gameState.mode);
  };

  // Find GeoJSON feature
  const currentGeoFeature = (gameState.currentCountry && geoData) ?
    geoData.features.find((f: any) => f.id === gameState.currentCountry?.cca3) : null;

  if (loading) return <div className="text-white flex justify-center items-center h-screen">Loading Globe Data...</div>;

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-900 text-white overflow-hidden relative">
      {!gameState.mode && <MainMenu onSelectMode={startGame} />}

      {gameState.mode && gameState.currentCountry && (
        <div className="w-full h-full relative flex flex-col">
          {/* Top Bar Stats */}
          <div className="absolute top-0 w-full z-[1001] bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center px-8 pointer-events-none">
            <div className="text-xl font-bold drop-shadow-md">Round {gameState.round} / {gameState.maxRounds}</div>
            <div className="text-2xl font-bold text-yellow-400 drop-shadow-md">Score: {gameState.score}</div>
            <button className="pointer-events-auto bg-white/20 hover:bg-white/30 px-3 py-1 rounded backdrop-blur-sm" onClick={() => setGameState(p => ({ ...p, mode: null }))}>Exit</button>
          </div>

          {/* Mode 1: Flag -> Map */}
          {gameState.mode === 'flag-to-map' && (
            <>
              <div className="absolute top-20 left-4 z-[1000] glass-panel p-4 max-w-xs animate-slide-in-left pointer-events-auto">
                <p className="text-center mb-2 font-bold">Where is this flag?</p>
                <div className="flex justify-center">
                  <FlagCard flagUrl={gameState.currentCountry.flags.svg} size="md" className="bg-white/10" />
                </div>
                {gameState.showResult && (
                  <div className="mt-4 text-center animate-fade-in">
                    <div className={`text-xl font-bold mb-1 ${gameState.lastGuessCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {gameState.lastGuessCorrect ? 'Correct!' : 'Incorrect'}
                    </div>
                    <p className="mb-2 text-sm">{CountryService.getJapaneseName(gameState.currentCountry)}</p>
                    <button onClick={nextRound} className="w-full btn-glass bg-blue-600/50">Next ➡</button>
                  </div>
                )}
              </div>
              <div className="flex-grow w-full h-full">
                <MapBoard
                  onMapClick={handleMapClick}
                  markers={
                    gameState.showResult && gameState.currentCountry ?
                      [{ lat: gameState.currentCountry.latlng[0], lng: gameState.currentCountry.latlng[1], message: CountryService.getJapaneseName(gameState.currentCountry) }]
                      : (clickedLocation ? [{ lat: clickedLocation.lat, lng: clickedLocation.lng, message: "Your guess" }] : [])
                  }
                />
              </div>
            </>
          )}

          {/* Mode 2: Name -> Flag */}
          {gameState.mode === 'name-to-flag' && (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 z-[1000]">
              <h2 className="text-4xl font-bold mb-8 text-center drop-shadow-lg">
                {CountryService.getJapaneseName(gameState.currentCountry)}
              </h2>
              <div className="grid grid-cols-2 gap-8">
                {gameState.options.map((country, idx) => (
                  <div key={idx} className="relative">
                    <FlagCard
                      flagUrl={country.flags.svg}
                      size="lg"
                      onClick={() => handleOptionSelect(country)}
                      className={`
                                    ${gameState.showResult && country.cca3 === gameState.currentCountry?.cca3 ? 'border-4 border-green-500 shadow-[0_0_30px_rgba(0,255,0,0.5)]' : ''}
                                    ${gameState.showResult && country.cca3 !== gameState.currentCountry?.cca3 ? 'opacity-50 grayscale' : ''}
                                `}
                    />
                  </div>
                ))}
              </div>
              {gameState.showResult && (
                <div className="mt-8 animate-fade-in">
                  <button onClick={nextRound} className="btn-glass text-xl px-12 py-4 bg-green-600/40 hover:bg-green-500/50">Next Round ➡</button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Map -> Flag */}
          {gameState.mode === 'map-to-flag' && (
            <div className="w-full h-full relative flex flex-col">
              {/* Map covers top half, options bottom half? Or full map with overlay? */}
              {/* Let's do Full Map, Options Overlay at bottom */}
              <div className="absolute inset-0 z-0">
                <MapBoard
                  highlightCountry={currentGeoFeature}
                  center={gameState.currentCountry.latlng}
                  zoom={3}
                  markers={
                    [{ lat: gameState.currentCountry.latlng[0], lng: gameState.currentCountry.latlng[1], message: "Target" }]
                  }
                />
              </div>

              <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-[1000] flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-4 drop-shadow-md">Which flag belongs to the highlighted country?</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 w-full justify-center">
                  {gameState.options.map((country, idx) => (
                    <FlagCard
                      key={idx}
                      flagUrl={country.flags.svg}
                      size="md"
                      onClick={() => handleOptionSelect(country)}
                      className={`
                                      flex-shrink-0
                                      ${gameState.showResult && country.cca3 === gameState.currentCountry?.cca3 ? 'border-4 border-green-500 scale-110 z-10' : ''}
                                      ${gameState.showResult && country.cca3 !== gameState.currentCountry?.cca3 ? 'opacity-40 grayscale' : ''}
                                  `}
                    />
                  ))}
                </div>
                {gameState.showResult && (
                  <button onClick={nextRound} className="mt-2 btn-glass bg-green-600/50">Next Round ➡</button>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;
