import { useEffect, useState } from 'react';
import type { Country, GameState } from './types';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { CountryService } from './services/countryService';
import MainMenu from './components/MainMenu';
import MapBoard from './components/MapBoard';
import FlagCard from './components/FlagCard';
import L from 'leaflet';
import axios from 'axios';

type ChoiceMode = 'name-to-flag' | 'flag-to-name';

type ChoiceReviewItem = {
  id: string;
  round: number;
  mode: ChoiceMode;
  questionCountry: Country;
  options: Country[];
  selectedCountry: Country;
  correctCountry: Country;
  isCorrect: boolean;
};

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, GeoJsonProperties> | null>(null);
  const [choiceReview, setChoiceReview] = useState<ChoiceReviewItem[]>([]);
  const [choiceSummary, setChoiceSummary] = useState<{ mode: ChoiceMode; score: number; maxRounds: number } | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    round: 1,
    maxRounds: 5,
    mode: null,
    currentCountry: null,
    options: [],
    showResult: false,
    lastGuessCorrect: null,
    selectedOptionCca3: null
  });

  const [clickedLocation, setClickedLocation] = useState<L.LatLng | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await CountryService.getAllCountries();
      setCountries(data);

      try {
        // Fetch low-res GeoJSON for world
        const geoRes = await axios.get<FeatureCollection<Geometry, GeoJsonProperties>>('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        setGeoData(geoRes.data);
      } catch (e) {
        console.error("Failed to load GeoJSON", e);
      }

      setLoading(false);
    };
    loadData();
  }, []);

  const startGame = (mode: GameState['mode']) => {
    if (mode === 'name-to-flag' || mode === 'flag-to-name') {
      setChoiceReview([]);
      setChoiceSummary(null);
    }
    startRound(1, 0, mode);
  };

  const startRound = (round: number, score: number, mode: GameState['mode']) => {
    // Basic filtering to ensure we have flags and good data
    const validCountries = countries.filter(c => c.flags && c.flags.svg);
    const randomCountries = CountryService.getRandomCountries(validCountries, 1);
    const target = randomCountries[0];

    let options: Country[] = [];
    if (mode === 'name-to-flag' || mode === 'flag-to-name' || mode === 'map-to-flag') {
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
      lastGuessCorrect: null,
      selectedOptionCca3: null
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

    const currentCountry = gameState.currentCountry;
    const isCorrect = selected.cca3 === currentCountry.cca3;
    if (gameState.mode === 'name-to-flag' || gameState.mode === 'flag-to-name') {
      const choiceMode: ChoiceMode = gameState.mode;
      setChoiceReview(prev => [
        ...prev,
        {
          id: `${gameState.round}-${currentCountry.cca3}-${selected.cca3}`,
          round: gameState.round,
          mode: choiceMode,
          questionCountry: currentCountry,
          options: [...gameState.options],
          selectedCountry: selected,
          correctCountry: currentCountry,
          isCorrect
        }
      ]);
    }

    setGameState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 100 : prev.score,
      showResult: true,
      lastGuessCorrect: isCorrect,
      selectedOptionCca3: selected.cca3
    }));
  };

  const nextRound = () => {
    if (gameState.round >= gameState.maxRounds) {
      if (gameState.mode === 'name-to-flag' || gameState.mode === 'flag-to-name') {
        setChoiceSummary({
          mode: gameState.mode,
          score: gameState.score,
          maxRounds: gameState.maxRounds
        });
        setGameState(prev => ({ ...prev, mode: null }));
        return;
      }

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
    (geoData.features.find((f) => f.id === gameState.currentCountry?.cca3) ?? null) : null;
  const closeChoiceSummary = () => {
    setChoiceSummary(null);
    setChoiceReview([]);
  };

  if (loading) return <div className="text-white flex justify-center items-center h-screen">Loading Globe Data...</div>;

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-900 text-white overflow-hidden relative">
      {!gameState.mode && !choiceSummary && <MainMenu onSelectMode={startGame} />}

      {!gameState.mode && choiceSummary && (
        <div className="w-full h-full overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto glass-panel p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
              {choiceSummary.mode === 'name-to-flag' ? '国名から国旗 - 結果' : '国旗から国名 - 結果'}
            </h2>
            <p className="mt-3 text-center text-lg md:text-xl">
              スコア: <span className="text-yellow-400 font-bold">{choiceSummary.score}</span> / {choiceSummary.maxRounds * 100}
            </p>
            <p className="mt-2 text-center opacity-80">
              各ラウンドの選択結果:
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {choiceReview.map((item) => (
                <div key={item.id} className="glass-panel p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm opacity-80">Round {item.round}</span>
                    <span className={`name-to-flag-result-badge ${item.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                      {item.isCorrect ? '正解' : '不正解'}
                    </span>
                  </div>
                  <div className="text-sm md:text-base">
                    問題:
                    <span className="font-semibold ml-1">
                      {item.mode === 'name-to-flag' ? CountryService.getJapaneseName(item.questionCountry) : 'この国旗はどこの国？'}
                    </span>
                  </div>
                  {item.mode === 'flag-to-name' && (
                    <div className="flex justify-center">
                      <FlagCard
                        flagUrl={item.questionCountry.flags.svg}
                        altText={CountryService.getJapaneseName(item.questionCountry)}
                        size="sm"
                        imageFit="fill"
                      />
                    </div>
                  )}
                  {item.mode === 'name-to-flag' ? (
                    <div className="name-to-flag-summary-options-row">
                      {item.options.map((option) => {
                        const isSelected = option.cca3 === item.selectedCountry.cca3;
                        const isCorrectOption = option.cca3 === item.correctCountry.cca3;
                        const optionHighlightClass = item.isCorrect
                          ? (isCorrectOption ? 'name-to-flag-summary-option-correct' : 'name-to-flag-summary-option-neutral')
                          : (isSelected
                            ? 'name-to-flag-summary-option-wrong'
                            : (isCorrectOption ? 'name-to-flag-summary-option-correct' : 'name-to-flag-summary-option-neutral'));

                        return (
                          <div key={`${item.id}-${option.cca3}`} className="name-to-flag-summary-option-item">
                            <FlagCard
                              flagUrl={option.flags.svg}
                              altText={CountryService.getJapaneseName(option)}
                              size="sm"
                              imageFit="fill"
                              className={`name-to-flag-summary-option-card ${optionHighlightClass}`}
                            />
                            <p className="text-xs text-center">{CountryService.getJapaneseName(option)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flag-to-name-summary-options-row">
                      {item.options.map((option) => {
                        const isSelected = option.cca3 === item.selectedCountry.cca3;
                        const isCorrectOption = option.cca3 === item.correctCountry.cca3;
                        const optionHighlightClass = item.isCorrect
                          ? (isCorrectOption ? 'name-to-flag-summary-option-correct' : 'name-to-flag-summary-option-neutral')
                          : (isSelected
                            ? 'name-to-flag-summary-option-wrong'
                            : (isCorrectOption ? 'name-to-flag-summary-option-correct' : 'name-to-flag-summary-option-neutral'));
                        return (
                          <div key={`${item.id}-${option.cca3}`} className={`flag-to-name-summary-option ${optionHighlightClass}`}>
                            {CountryService.getJapaneseName(option)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!item.isCorrect && (
                    <div className="text-sm text-red-200/90">
                      赤枠: あなたの選択 / 緑枠: 正解
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => startGame(choiceSummary.mode)}
                className="btn-glass bg-blue-600/40 hover:bg-blue-500/50"
              >
                このモードでもう一度
              </button>
              <button
                onClick={closeChoiceSummary}
                className="btn-glass"
              >
                メインメニューへ
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="name-to-flag-mode">
              <h2 className="name-to-flag-title">
                {CountryService.getJapaneseName(gameState.currentCountry)}
              </h2>
              <div className="name-to-flag-options-grid">
                {gameState.options.map((country, idx) => (
                  <div key={idx} className="name-to-flag-option">
                    <FlagCard
                      flagUrl={country.flags.svg}
                      size="md"
                      imageFit="fill"
                      fitToContainer
                      onClick={() => handleOptionSelect(country)}
                      className={`name-to-flag-card
                        ${gameState.showResult && country.cca3 === gameState.currentCountry?.cca3 ? 'flag-choice-correct' : ''}
                        ${gameState.showResult && country.cca3 !== gameState.currentCountry?.cca3 ? 'flag-choice-wrong' : ''}
                      `}
                    />
                  </div>
                ))}
              </div>
              {gameState.showResult && (
                <div className="name-to-flag-next">
                  <button onClick={nextRound} className="btn-glass">Next Round ➡</button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Flag -> Name */}
          {gameState.mode === 'flag-to-name' && (
            <div className="name-to-flag-mode">
              <h2 className="name-to-flag-title">この国旗の国名は？</h2>
              <div className="mb-5">
                <FlagCard
                  flagUrl={gameState.currentCountry.flags.svg}
                  altText={CountryService.getJapaneseName(gameState.currentCountry)}
                  size="lg"
                  imageFit="fill"
                />
              </div>
              <div className="flag-to-name-options-grid">
                {gameState.options.map((country, idx) => {
                  const isSelected = gameState.selectedOptionCca3 === country.cca3;
                  const isCorrectOption = country.cca3 === gameState.currentCountry?.cca3;
                  const highlightClass = !gameState.showResult
                    ? ''
                    : (isCorrectOption
                      ? 'flag-to-name-choice-correct'
                      : (!gameState.lastGuessCorrect && isSelected ? 'flag-to-name-choice-wrong' : 'flag-to-name-choice-neutral'));

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(country)}
                      className={`flag-to-name-option-button ${highlightClass}`}
                    >
                      {CountryService.getJapaneseName(country)}
                    </button>
                  );
                })}
              </div>
              {gameState.showResult && (
                <div className="name-to-flag-next">
                  <button onClick={nextRound} className="btn-glass">Next Round ➡</button>
                </div>
              )}
            </div>
          )}

          {/* Mode 4: Map -> Flag */}
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
