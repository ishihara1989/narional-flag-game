import type { Country, FlagAttributes } from '../types';

const COLOR_ATTRIBUTE_KEY = 'color';
const REGION_ATTRIBUTE_KEY = 'region';
const HARD_MODE_CANDIDATE_LIMIT = 15;

const FULL_WEIGHT_ATTRIBUTE_KEYS: Array<Exclude<keyof FlagAttributes, 'color' | 'region'>> = [
  'layout',
  'motif',
  'group'
];

const normalizeCountryName = (name: string): string => name.trim().normalize('NFKC');

const toLooseCountryName = (name: string): string =>
  normalizeCountryName(name).replace(/[\s・･]/g, '');

const toTagSet = (tags?: string[]): Set<string> => new Set(tags ?? []);

const countSharedTags = (source: Set<string>, target: Set<string>): number => {
  let sharedCount = 0;
  source.forEach((tag) => {
    if (target.has(tag)) {
      sharedCount += 1;
    }
  });
  return sharedCount;
};

const hasSameTags = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false;
  return countSharedTags(left, right) === left.size;
};

const shuffleCountries = (countries: Country[]): Country[] => {
  const shuffled = [...countries];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getSimilarityScore = (
  sourceAttributes: FlagAttributes,
  candidateAttributes: FlagAttributes
): number => {
  let score = 0;

  FULL_WEIGHT_ATTRIBUTE_KEYS.forEach((attributeKey) => {
    const sourceSet = toTagSet(sourceAttributes[attributeKey]);
    const candidateSet = toTagSet(candidateAttributes[attributeKey]);
    score += countSharedTags(sourceSet, candidateSet);
  });

  const sourceColorSet = toTagSet(sourceAttributes[COLOR_ATTRIBUTE_KEY]);
  const candidateColorSet = toTagSet(candidateAttributes[COLOR_ATTRIBUTE_KEY]);
  score += countSharedTags(sourceColorSet, candidateColorSet) * 0.5;

  const sourceRegionSet = toTagSet(sourceAttributes[REGION_ATTRIBUTE_KEY]);
  const candidateRegionSet = toTagSet(candidateAttributes[REGION_ATTRIBUTE_KEY]);
  score += countSharedTags(sourceRegionSet, candidateRegionSet) * 0.5;

  if (sourceColorSet.size > 0 && hasSameTags(sourceColorSet, candidateColorSet)) {
    score += 1;
  }

  return score;
};

const pickWeightedIndex = (weights: number[]): number => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return 0;

  let randomWeight = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i += 1) {
    randomWeight -= weights[i];
    if (randomWeight <= 0) return i;
  }
  return weights.length - 1;
};

const getCountryNameCandidates = (country: Country): string[] => {
  const names = [
    country.translations.jpn?.common,
    country.translations.jpn?.official,
    country.name.common,
    country.name.official
  ];
  const uniqueNames = Array.from(new Set(names.filter((name): name is string => Boolean(name))));
  return uniqueNames.map(normalizeCountryName);
};

export const buildFlagAttributesByCca3 = (
  countries: Country[],
  rawAttributesByCountryName: Record<string, FlagAttributes>
): Record<string, FlagAttributes> => {
  const byExactName = new Map<string, FlagAttributes>();
  const byLooseName = new Map<string, FlagAttributes>();

  Object.entries(rawAttributesByCountryName).forEach(([countryName, attributes]) => {
    const normalizedName = normalizeCountryName(countryName);
    byExactName.set(normalizedName, attributes);
    byLooseName.set(toLooseCountryName(normalizedName), attributes);
  });

  const attributesByCca3: Record<string, FlagAttributes> = {};

  countries.forEach((country) => {
    const candidates = getCountryNameCandidates(country);
    const exactMatch = candidates.find((name) => byExactName.has(name));
    if (exactMatch) {
      attributesByCca3[country.cca3] = byExactName.get(exactMatch) as FlagAttributes;
      return;
    }

    const looseMatchName = candidates.find((name) => byLooseName.has(toLooseCountryName(name)));
    if (looseMatchName) {
      attributesByCca3[country.cca3] = byLooseName.get(toLooseCountryName(looseMatchName)) as FlagAttributes;
    }
  });

  return attributesByCca3;
};

export const pickHardModeDistractors = (
  questionCountry: Country,
  candidateCountries: Country[],
  distractorCount: number,
  attributesByCca3: Record<string, FlagAttributes>
): Country[] => {
  if (distractorCount <= 0 || candidateCountries.length === 0) return [];

  const sourceAttributes = attributesByCca3[questionCountry.cca3];
  if (!sourceAttributes) {
    return shuffleCountries(candidateCountries).slice(0, distractorCount);
  }

  const rankedCandidates = candidateCountries
    .map((country) => {
      const candidateAttributes = attributesByCca3[country.cca3];
      if (!candidateAttributes) return null;

      return {
        country,
        score: getSimilarityScore(sourceAttributes, candidateAttributes)
      };
    })
    .filter((item): item is { country: Country; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .slice(0, HARD_MODE_CANDIDATE_LIMIT)
    .map((item, index) => ({
      ...item,
      weight: HARD_MODE_CANDIDATE_LIMIT - index
    }));

  const weightedPool = [...rankedCandidates];
  const selected: Country[] = [];

  while (selected.length < distractorCount && weightedPool.length > 0) {
    const weights = weightedPool.map((candidate) => candidate.weight);
    const pickedIndex = pickWeightedIndex(weights);
    selected.push(weightedPool[pickedIndex].country);
    weightedPool.splice(pickedIndex, 1);
  }

  if (selected.length >= distractorCount) {
    return selected;
  }

  const selectedSet = new Set(selected.map((country) => country.cca3));
  const fallbackCountries = shuffleCountries(
    candidateCountries.filter((country) => !selectedSet.has(country.cca3))
  ).slice(0, distractorCount - selected.length);

  return [...selected, ...fallbackCountries];
};
