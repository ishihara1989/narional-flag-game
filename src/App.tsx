import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type {
  Country,
  FlagAttributes,
  GameMode,
  GameSettings,
  GameState,
  MemoryRegion
} from './types';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { CountryService } from './services/countryService';
import { buildFlagAttributesByCca3, getTopSimilarCountries, pickHardModeDistractors } from './services/flagDifficultyService';
import MainMenu from './components/MainMenu';
import SettingsMenu from './components/SettingsMenu';
import MapBoard from './components/MapBoard';
import FlagCard from './components/FlagCard';
import L from 'leaflet';
import axios from 'axios';

type StandardChoiceMode = 'name-to-flag' | 'flag-to-name';
type MemoryChoiceMode = 'memory-name-to-flag' | 'memory-flag-to-name';
type ChoiceMode = StandardChoiceMode;
type MemoryCategoryType = 'region' | 'motif' | 'layout';
type MemoryCategoryId =
  | MemoryRegion
  | 'motif-simple'
  | 'motif-emblem'
  | 'motif-sun'
  | 'motif-star-moon'
  | 'layout-horizontal'
  | 'layout-vertical'
  | 'layout-triangle-diagonal'
  | 'layout-canton'
  | 'layout-cross';

type MemoryCategory = {
  id: MemoryCategoryId;
  type: MemoryCategoryType;
  label: string;
  tags?: string[];
};

type MemoryCategorySection = {
  id: string;
  title: string;
  categories: MemoryCategory[];
};

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

type RoundPlanItem = {
  questionCountry: Country;
  options: Country[];
};

const MEMORY_REGIONS: MemoryRegion[] = ['americas', 'europe', 'africa', 'asia', 'oceania'];
const MEMORY_REGION_LABELS: Record<MemoryRegion, string> = {
  americas: '南北アメリカ',
  europe: 'ヨーロッパ',
  africa: 'アフリカ',
  asia: 'アジア',
  oceania: 'オセアニア'
};
const COUNTRY_REGION_TO_MEMORY_REGION: Record<string, MemoryRegion> = {
  Americas: 'americas',
  Europe: 'europe',
  Africa: 'africa',
  Asia: 'asia',
  Oceania: 'oceania'
};
const MIN_MEMORY_CATEGORY_COUNTRY_COUNT = 10;

const MEMORY_REGION_CATEGORIES: MemoryCategory[] = MEMORY_REGIONS.map((region) => ({
  id: region,
  type: 'region',
  label: MEMORY_REGION_LABELS[region]
}));

const MEMORY_MOTIF_CATEGORIES: MemoryCategory[] = [
  {
    id: 'motif-simple',
    type: 'motif',
    label: 'シンプルデザイン（モチーフなし）'
  },
  {
    id: 'motif-emblem',
    type: 'motif',
    label: 'エンブレム付き',
    tags: ['emblem']
  },
  {
    id: 'motif-sun',
    type: 'motif',
    label: '太陽モチーフ',
    tags: ['sun']
  },
  {
    id: 'motif-star-moon',
    type: 'motif',
    label: '星・月モチーフ',
    tags: ['star', 'crescent_star', 'moon']
  }
];

const MEMORY_LAYOUT_CATEGORIES: MemoryCategory[] = [
  {
    id: 'layout-horizontal',
    type: 'layout',
    label: '横帯レイアウト',
    tags: ['tri_h', 'stripes', 'bicolor_h']
  },
  {
    id: 'layout-vertical',
    type: 'layout',
    label: '縦帯レイアウト',
    tags: ['tri_v', 'bicolor_v']
  },
  {
    id: 'layout-triangle-diagonal',
    type: 'layout',
    label: '三角・斜線レイアウト',
    tags: ['triangle', 'diagonal']
  },
  {
    id: 'layout-canton',
    type: 'layout',
    label: 'カントンあり',
    tags: ['canton']
  },
  {
    id: 'layout-cross',
    type: 'layout',
    label: '十字・斜め十字',
    tags: ['nordic', 'cross', 'saltire']
  }
];

const MEMORY_CATEGORY_SECTIONS: MemoryCategorySection[] = [
  {
    id: 'region',
    title: '地域別',
    categories: MEMORY_REGION_CATEGORIES
  },
  {
    id: 'motif',
    title: 'モチーフ別',
    categories: MEMORY_MOTIF_CATEGORIES
  },
  {
    id: 'layout',
    title: 'レイアウト別',
    categories: MEMORY_LAYOUT_CATEGORIES
  }
];

const MEMORY_CATEGORY_BY_ID = new Map<MemoryCategoryId, MemoryCategory>(
  [...MEMORY_REGION_CATEGORIES, ...MEMORY_MOTIF_CATEGORIES, ...MEMORY_LAYOUT_CATEGORIES].map((category) => [
    category.id,
    category
  ])
);

const DEFAULT_SETTINGS: GameSettings = {
  maxRounds: 5,
  optionCount: 4,
  highDifficulty: false
};

const MAX_ROUNDS = 10;
const MAX_OPTION_COUNT = 9;
const MIN_ROUNDS = 1;
const MIN_OPTION_COUNT = 2;
const SETTINGS_STORAGE_KEY = 'national-flag-game-settings-v1';

const clampSettingValue = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const normalizeGameSettings = (settings: unknown): GameSettings => {
  if (!settings || typeof settings !== 'object') return DEFAULT_SETTINGS;

  const parsed = settings as Partial<GameSettings>;
  return {
    maxRounds: clampSettingValue(parsed.maxRounds, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_SETTINGS.maxRounds),
    optionCount: clampSettingValue(
      parsed.optionCount,
      MIN_OPTION_COUNT,
      MAX_OPTION_COUNT,
      DEFAULT_SETTINGS.optionCount
    ),
    highDifficulty: typeof parsed.highDifficulty === 'boolean'
      ? parsed.highDifficulty
      : DEFAULT_SETTINGS.highDifficulty
  };
};

const loadSavedGameSettings = (): GameSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeGameSettings(JSON.parse(raw));
  } catch (error) {
    console.error('Failed to load saved game settings', error);
    return DEFAULT_SETTINGS;
  }
};

const shuffleCountries = (source: Country[]): Country[] => {
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const isMemoryMode = (mode: GameMode): mode is MemoryChoiceMode =>
  mode === 'memory-name-to-flag' || mode === 'memory-flag-to-name';

const isStandardChoiceMode = (mode: GameMode): mode is StandardChoiceMode =>
  mode === 'name-to-flag' || mode === 'flag-to-name';

const isNameToFlagMode = (mode: GameMode): mode is 'name-to-flag' | 'memory-name-to-flag' =>
  mode === 'name-to-flag' || mode === 'memory-name-to-flag';

const isFlagToNameMode = (mode: GameMode): mode is 'flag-to-name' | 'memory-flag-to-name' =>
  mode === 'flag-to-name' || mode === 'memory-flag-to-name';

const modeUsesOptions = (mode: GameMode): boolean => mode !== 'flag-to-map';

const getMemoryRegionForCountry = (country: Country): MemoryRegion | null =>
  COUNTRY_REGION_TO_MEMORY_REGION[country.region] ?? null;

const hasAnyTag = (sourceTags: string[] | undefined, targetTags: string[] | undefined): boolean => {
  if (!sourceTags || sourceTags.length === 0 || !targetTags || targetTags.length === 0) return false;
  return sourceTags.some((tag) => targetTags.includes(tag));
};

const getMemoryCategoryCountries = (
  validCountries: Country[],
  attributesByCca3: Record<string, FlagAttributes>,
  category: MemoryCategory
): Country[] => {
  if (category.type === 'region') {
    return validCountries.filter((country) => getMemoryRegionForCountry(country) === category.id);
  }

  return validCountries.filter((country) => {
    const attributes = attributesByCca3[country.cca3];
    if (!attributes) return false;

    if (category.id === 'motif-simple') {
      return (attributes.motif?.length ?? 0) === 0;
    }

    if (category.type === 'motif') {
      return hasAnyTag(attributes.motif, category.tags);
    }

    return hasAnyTag(attributes.layout, category.tags);
  });
};

const pickRandomCountries = (source: Country[], count: number): Country[] =>
  shuffleCountries(source).slice(0, count);

const buildRoundPlan = (
  mode: GameMode,
  validCountries: Country[],
  settings: GameSettings,
  attributesByCca3: Record<string, FlagAttributes>,
  memoryCategory: MemoryCategory | null
): RoundPlanItem[] | null => {
  const maxRounds = Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, settings.maxRounds));
  const optionCount = Math.max(MIN_OPTION_COUNT, Math.min(MAX_OPTION_COUNT, settings.optionCount));

  if (isMemoryMode(mode)) {
    if (!memoryCategory) return null;

    const memoryCountries = shuffleCountries(
      getMemoryCategoryCountries(validCountries, attributesByCca3, memoryCategory)
    );
    if (memoryCountries.length < MIN_OPTION_COUNT) return null;

    const effectiveOptionCount = Math.min(optionCount, memoryCountries.length);
    const roundPlan: RoundPlanItem[] = [];

    for (const questionCountry of memoryCountries) {
      const candidates = memoryCountries.filter((country) => country.cca3 !== questionCountry.cca3);
      const distractorCount = effectiveOptionCount - 1;
      const distractors = settings.highDifficulty
        ? pickHardModeDistractors(
          questionCountry,
          candidates,
          distractorCount,
          attributesByCca3
        )
        : pickRandomCountries(candidates, distractorCount);

      if (distractors.length < distractorCount) return null;

      roundPlan.push({
        questionCountry,
        options: shuffleCountries([questionCountry, ...distractors])
      });
    }

    return roundPlan;
  }

  if (modeUsesOptions(mode)) {
    const requiredCountries = maxRounds * optionCount;
    if (validCountries.length < requiredCountries) return null;

    const remainingCountries = shuffleCountries(validCountries);
    const roundPlan: RoundPlanItem[] = [];

    for (let roundIdx = 0; roundIdx < maxRounds; roundIdx += 1) {
      const questionCountry = remainingCountries.shift();
      if (!questionCountry) return null;

      const distractorCount = optionCount - 1;
      const distractors = settings.highDifficulty
        ? pickHardModeDistractors(
          questionCountry,
          remainingCountries,
          distractorCount,
          attributesByCca3
        )
        : pickRandomCountries(remainingCountries, distractorCount);

      if (distractors.length < distractorCount) return null;

      const distractorCca3Set = new Set(distractors.map((country) => country.cca3));
      for (let i = remainingCountries.length - 1; i >= 0; i -= 1) {
        if (distractorCca3Set.has(remainingCountries[i].cca3)) {
          remainingCountries.splice(i, 1);
        }
      }

      roundPlan.push({
        questionCountry,
        options: shuffleCountries([questionCountry, ...distractors])
      });
    }

    return roundPlan;
  }

  if (validCountries.length < maxRounds) return null;

  return shuffleCountries(validCountries)
    .slice(0, maxRounds)
    .map((questionCountry) => ({
      questionCountry,
      options: []
    }));
};

const getOptionGridColumns = (optionCount: number): number => {
  if (optionCount <= 1) return 1;
  if (optionCount <= 4) return 2;
  return 3;
};

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, GeoJsonProperties> | null>(null);
  const [choiceReview, setChoiceReview] = useState<ChoiceReviewItem[]>([]);
  const [choiceSummary, setChoiceSummary] = useState<{ mode: ChoiceMode; score: number; maxRounds: number } | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => loadSavedGameSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [roundPlan, setRoundPlan] = useState<RoundPlanItem[]>([]);
  const [attributesByCca3, setAttributesByCca3] = useState<Record<string, FlagAttributes>>({});
  const [pendingMemoryMode, setPendingMemoryMode] = useState<MemoryChoiceMode | null>(null);
  const [activeMemoryCategory, setActiveMemoryCategory] = useState<MemoryCategory | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    round: 1,
    maxRounds: DEFAULT_SETTINGS.maxRounds,
    mode: null,
    currentCountry: null,
    options: [],
    showResult: false,
    lastGuessCorrect: null,
    selectedOptionCca3: null
  });

  const [clickedLocation, setClickedLocation] = useState<L.LatLng | null>(null);
  const validCountries = useMemo(
    () => countries.filter((country) => country.flags && country.flags.svg),
    [countries]
  );
  const memoryCategorySections = useMemo(
    () => MEMORY_CATEGORY_SECTIONS
      .map((section) => ({
        ...section,
        categories: section.categories
          .map((category) => ({
            ...category,
            countryCount: getMemoryCategoryCountries(validCountries, attributesByCca3, category).length
          }))
          .filter((category) => category.countryCount >= MIN_MEMORY_CATEGORY_COUNTRY_COUNT)
      }))
      .filter((section) => section.categories.length > 0),
    [validCountries, attributesByCca3]
  );

  useEffect(() => {
    const loadData = async () => {
      const data = await CountryService.getAllCountries();
      setCountries(data);

      try {
        const attributeResponse = await fetch('/attributes.json');
        if (attributeResponse.ok) {
          const rawAttributes = (await attributeResponse.json()) as Record<string, FlagAttributes>;
          setAttributesByCca3(buildFlagAttributesByCca3(data, rawAttributes));
        } else {
          console.error('Failed to load attributes.json');
        }
      } catch (e) {
        console.error('Failed to load flag attributes', e);
      }

      try {
        // Fetch low-res GeoJSON for world
        const geoRes = await axios.get<FeatureCollection<Geometry, GeoJsonProperties>>('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        setGeoData(geoRes.data);
      } catch (e) {
        console.error('Failed to load GeoJSON', e);
      }

      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(gameSettings));
    } catch (error) {
      console.error('Failed to save game settings', error);
    }
  }, [gameSettings]);

  const startRound = (
    round: number,
    score: number,
    mode: GameMode,
    sourceRoundPlan: RoundPlanItem[]
  ) => {
    const roundData = sourceRoundPlan[round - 1];
    if (!roundData) return;

    setGameState({
      score,
      round,
      maxRounds: sourceRoundPlan.length,
      mode,
      currentCountry: roundData.questionCountry,
      options: [...roundData.options],
      showResult: false,
      lastGuessCorrect: null,
      selectedOptionCca3: null
    });
    setClickedLocation(null);
  };

  const returnToMenu = () => {
    setGameState((prev) => ({ ...prev, mode: null }));
    setRoundPlan([]);
    setClickedLocation(null);
    setPendingMemoryMode(null);
    setActiveMemoryCategory(null);
  };

  const launchGame = (mode: GameMode, memoryCategory: MemoryCategory | null = null) => {
    if (isStandardChoiceMode(mode)) {
      setChoiceReview([]);
      setChoiceSummary(null);
    }

    const newRoundPlan = buildRoundPlan(mode, validCountries, gameSettings, attributesByCca3, memoryCategory);

    if (!newRoundPlan || newRoundPlan.length === 0) {
      window.alert('ゲームデータが不足しているため、この設定では開始できません。');
      return;
    }

    setRoundPlan(newRoundPlan);
    setShowSettings(false);
    setPendingMemoryMode(null);
    setActiveMemoryCategory(isMemoryMode(mode) ? memoryCategory : null);
    startRound(1, 0, mode, newRoundPlan);
  };

  const startGame = (mode: GameState['mode']) => {
    if (!mode) return;

    if (isMemoryMode(mode)) {
      setShowSettings(false);
      setPendingMemoryMode(mode);
      return;
    }

    launchGame(mode, null);
  };

  const startMemoryGame = (categoryId: MemoryCategoryId) => {
    if (!pendingMemoryMode) return;
    const category = MEMORY_CATEGORY_BY_ID.get(categoryId);
    if (!category) return;
    launchGame(pendingMemoryMode, category);
  };

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

    setGameState((prev) => ({
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
    if (gameState.mode && isStandardChoiceMode(gameState.mode)) {
      const choiceMode: ChoiceMode = gameState.mode;
      setChoiceReview((prev) => [
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

    setGameState((prev) => ({
      ...prev,
      score: isCorrect ? prev.score + 100 : prev.score,
      showResult: true,
      lastGuessCorrect: isCorrect,
      selectedOptionCca3: selected.cca3
    }));
  };

  const nextRound = () => {
    if (!gameState.mode) return;

    if (gameState.round >= gameState.maxRounds) {
      if (isStandardChoiceMode(gameState.mode)) {
        setChoiceSummary({
          mode: gameState.mode,
          score: gameState.score,
          maxRounds: gameState.maxRounds
        });
        returnToMenu();
        return;
      }

      window.alert(`Game Over! Score: ${gameState.score}`);
      returnToMenu();
      return;
    }
    startRound(gameState.round + 1, gameState.score, gameState.mode, roundPlan);
  };

  // Find GeoJSON feature
  const currentGeoFeature = (gameState.currentCountry && geoData)
    ? (geoData.features.find((f) => f.id === gameState.currentCountry?.cca3) ?? null)
    : null;
  const closeChoiceSummary = () => {
    setChoiceSummary(null);
    setChoiceReview([]);
    setRoundPlan([]);
  };
  const optionGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${getOptionGridColumns(gameState.options.length)}, minmax(0, 1fr))`
  };
  const isCurrentMemoryMode = Boolean(gameState.mode && isMemoryMode(gameState.mode));
  const isCurrentNameToFlagMode = Boolean(gameState.mode && isNameToFlagMode(gameState.mode));
  const isCurrentFlagToNameMode = Boolean(gameState.mode && isFlagToNameMode(gameState.mode));
  const similarFlagTop3 = useMemo(() => {
    if (!gameState.showResult || !gameState.currentCountry || !gameState.mode) return [];
    if (!isNameToFlagMode(gameState.mode) && !isFlagToNameMode(gameState.mode)) return [];

    const candidateCountries = countries.filter(
      (country) => country.cca3 !== gameState.currentCountry?.cca3 && country.flags?.svg
    );
    return getTopSimilarCountries(
      gameState.currentCountry,
      candidateCountries,
      3,
      attributesByCca3
    );
  }, [gameState.showResult, gameState.currentCountry, gameState.mode, countries, attributesByCca3]);
  const getChoiceOptionHighlightClass = (country: Country): string => {
    const isSelected = gameState.selectedOptionCca3 === country.cca3;
    const isCorrectOption = country.cca3 === gameState.currentCountry?.cca3;
    if (!gameState.showResult) return '';
    if (isCorrectOption) return 'choice-option-correct';
    if (!gameState.lastGuessCorrect && isSelected) return 'choice-option-wrong';
    return 'choice-option-neutral';
  };
  const similarFlagsSection = gameState.showResult && similarFlagTop3.length > 0 && (
    <div className="similar-flags-shell">
      <p className="similar-flags-title">正解に似ている国旗 Top 3</p>
      <div className="similar-flags-grid">
        {similarFlagTop3.map((country) => (
          <div key={`similar-${gameState.currentCountry?.cca3}-${country.cca3}`} className="similar-flag-item">
            <FlagCard
              flagUrl={country.flags.svg}
              altText={CountryService.getJapaneseName(country)}
              size="sm"
              imageFit="fill"
              fitToContainer
              className="similar-flag-card"
            />
            <p className="similar-flag-name">{CountryService.getJapaneseName(country)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <div className="text-white flex justify-center items-center h-screen">Loading Globe Data...</div>;

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-900 text-white overflow-hidden relative">
      {!gameState.mode && !choiceSummary && !showSettings && !pendingMemoryMode && (
        <MainMenu
          onSelectMode={startGame}
          settings={gameSettings}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      {!gameState.mode && !choiceSummary && showSettings && (
        <SettingsMenu
          settings={gameSettings}
          onChangeSettings={setGameSettings}
          onBack={() => setShowSettings(false)}
        />
      )}
      {!gameState.mode && !choiceSummary && !showSettings && pendingMemoryMode && (
        <div className="memory-region-menu glass-panel">
          <h2 className="memory-region-title">暗記モード: 出題カテゴリを選択</h2>
          <p className="memory-region-subtitle">
            {pendingMemoryMode === 'memory-name-to-flag'
              ? '国名 → 国旗で出題します'
              : '国旗 → 国名で出題します'}
          </p>
          <p className="memory-region-subtitle">10問以上あるカテゴリのみ表示しています。</p>
          <div className="memory-category-sections">
            {memoryCategorySections.map((section) => (
              <section key={section.id} className="memory-category-section">
                <h3 className="memory-category-section-title">{section.title}</h3>
                <div className="memory-region-grid">
                  {section.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => startMemoryGame(category.id)}
                      className="btn-glass memory-region-button"
                    >
                      <span>{category.label}</span>
                      <span className="memory-category-count">{category.countryCount}問</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {memoryCategorySections.length === 0 && (
            <p className="memory-region-subtitle">利用可能なカテゴリがありません。</p>
          )}
          <button
            onClick={() => setPendingMemoryMode(null)}
            className="btn-glass memory-region-back"
          >
            メインメニューへ戻る
          </button>
        </div>
      )}

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
            <div className="text-xl font-bold drop-shadow-md">
              <div>Round {gameState.round} / {gameState.maxRounds}</div>
              {isCurrentMemoryMode && activeMemoryCategory && (
                <div className="memory-active-region-label">{activeMemoryCategory.label}</div>
              )}
            </div>
            <div className="text-2xl font-bold text-yellow-400 drop-shadow-md">Score: {gameState.score}</div>
            <button className="pointer-events-auto bg-white/20 hover:bg-white/30 px-3 py-1 rounded backdrop-blur-sm" onClick={returnToMenu}>Exit</button>
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
                  height="100vh"
                  markers={
                    gameState.showResult && gameState.currentCountry
                      ? [{
                        lat: gameState.currentCountry.latlng[0],
                        lng: gameState.currentCountry.latlng[1],
                        message: CountryService.getJapaneseName(gameState.currentCountry)
                      }]
                      : (clickedLocation ? [{ lat: clickedLocation.lat, lng: clickedLocation.lng, message: 'Your guess' }] : [])
                  }
                />
              </div>
            </>
          )}

          {/* Mode 2 & Memory: Name -> Flag */}
          {isCurrentNameToFlagMode && (
            <div className="name-to-flag-mode">
              {isCurrentMemoryMode && activeMemoryCategory && (
                <p className="memory-mode-caption">暗記モード: {activeMemoryCategory.label}</p>
              )}
              <h2 className="name-to-flag-title">
                {CountryService.getJapaneseName(gameState.currentCountry)}
              </h2>
              <div className="name-to-flag-options-grid" style={optionGridStyle}>
                {gameState.options.map((country) => (
                  <button
                    key={country.cca3}
                    onClick={() => handleOptionSelect(country)}
                    disabled={gameState.showResult}
                    className={`choice-option-button ${getChoiceOptionHighlightClass(country)}`}
                  >
                    <div className="choice-option-flag-wrap">
                      <img
                        src={country.flags.svg}
                        alt={CountryService.getJapaneseName(country)}
                        className="choice-option-flag"
                      />
                    </div>
                    {gameState.showResult && (
                      <span className="choice-option-name">{CountryService.getJapaneseName(country)}</span>
                    )}
                  </button>
                ))}
              </div>
              {gameState.showResult && (
                <div className="choice-answer-map-shell">
                  <p className="choice-answer-map-title">
                    正解の位置: {CountryService.getJapaneseName(gameState.currentCountry)}
                  </p>
                  <MapBoard
                    center={gameState.currentCountry.latlng}
                    zoom={3}
                    height="280px"
                    markers={[
                      {
                        lat: gameState.currentCountry.latlng[0],
                        lng: gameState.currentCountry.latlng[1],
                        message: CountryService.getJapaneseName(gameState.currentCountry)
                      }
                    ]}
                  />
                </div>
              )}
              {similarFlagsSection}
              {gameState.showResult && (
                <div className="name-to-flag-next">
                  <button onClick={nextRound} className="btn-glass">Next Round ➡</button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3 & Memory: Flag -> Name */}
          {isCurrentFlagToNameMode && (
            <div className="name-to-flag-mode">
              {isCurrentMemoryMode && activeMemoryCategory && (
                <p className="memory-mode-caption">暗記モード: {activeMemoryCategory.label}</p>
              )}
              <h2 className="name-to-flag-title">この国旗の国名は？</h2>
              <div className="mb-5">
                <FlagCard
                  flagUrl={gameState.currentCountry.flags.svg}
                  altText={CountryService.getJapaneseName(gameState.currentCountry)}
                  size="lg"
                  imageFit="fill"
                />
              </div>
              <div className="flag-to-name-options-grid" style={optionGridStyle}>
                {gameState.options.map((country) => (
                  <button
                    key={country.cca3}
                    onClick={() => handleOptionSelect(country)}
                    disabled={gameState.showResult}
                    className={`choice-option-button ${!gameState.showResult ? 'choice-option-button-text-only' : ''} ${getChoiceOptionHighlightClass(country)}`}
                  >
                    {gameState.showResult && (
                      <div className="choice-option-flag-wrap">
                        <img
                          src={country.flags.svg}
                          alt={CountryService.getJapaneseName(country)}
                          className="choice-option-flag"
                        />
                      </div>
                    )}
                    <span className="choice-option-name">{CountryService.getJapaneseName(country)}</span>
                  </button>
                ))}
              </div>
              {gameState.showResult && (
                <div className="choice-answer-map-shell">
                  <p className="choice-answer-map-title">
                    正解の位置: {CountryService.getJapaneseName(gameState.currentCountry)}
                  </p>
                  <MapBoard
                    center={gameState.currentCountry.latlng}
                    zoom={3}
                    height="280px"
                    markers={[
                      {
                        lat: gameState.currentCountry.latlng[0],
                        lng: gameState.currentCountry.latlng[1],
                        message: CountryService.getJapaneseName(gameState.currentCountry)
                      }
                    ]}
                  />
                </div>
              )}
              {similarFlagsSection}
              {gameState.showResult && (
                <div className="name-to-flag-next">
                  <button onClick={nextRound} className="btn-glass">Next Round ➡</button>
                </div>
              )}
            </div>
          )}

          {/* Mode 4: Map -> Flag */}
          {gameState.mode === 'map-to-flag' && (
            <div className="map-to-flag-mode-shell">
              <div className="map-to-flag-map-layer">
                <MapBoard
                  highlightCountry={currentGeoFeature}
                  center={gameState.currentCountry.latlng}
                  zoom={3}
                  height="100%"
                  markers={[
                    { lat: gameState.currentCountry.latlng[0], lng: gameState.currentCountry.latlng[1], message: 'Target' }
                  ]}
                />
              </div>

              <div className="map-to-flag-overlay">
                <h3 className="map-to-flag-overlay-title">Which flag belongs to the highlighted country?</h3>
                <div className="map-to-flag-options-grid" style={optionGridStyle}>
                  {gameState.options.map((country) => (
                    <FlagCard
                      key={country.cca3}
                      flagUrl={country.flags.svg}
                      size="md"
                      onClick={() => handleOptionSelect(country)}
                      className={`
                        map-to-flag-option-card
                        ${gameState.showResult && country.cca3 === gameState.currentCountry?.cca3 ? 'map-to-flag-option-card-correct' : ''}
                        ${gameState.showResult && country.cca3 !== gameState.currentCountry?.cca3 ? 'map-to-flag-option-card-wrong' : ''}
                      `}
                    />
                  ))}
                </div>
                {gameState.showResult && (
                  <button onClick={nextRound} className="btn-glass map-to-flag-next-button">Next Round ➡</button>
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
