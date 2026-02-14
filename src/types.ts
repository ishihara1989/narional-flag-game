export interface Country {
  name: {
    common: string;
    official: string;
    nativeName?: {
      [key: string]: {
        common: string;
        official: string;
      };
    };
  };
  tld?: string[];
  cca2: string;
  ccn3?: string;
  cca3: string;
  cioc?: string;
  independent?: boolean;
  status?: string;
  unMember?: boolean;
  currencies?: {
    [key: string]: {
      name: string;
      symbol: string;
    };
  };
  idd?: {
    root: string;
    suffixes: string[];
  };
  capital?: string[];
  altSpellings?: string[];
  region: string;
  subregion?: string;
  languages?: {
    [key: string]: string;
  };
  translations: {
    [key: string]: {
      common: string;
      official: string;
    };
  };
  latlng: [number, number];
  landlocked?: boolean;
  area?: number;
  demonyms?: {
    [key: string]: {
      f: string;
      m: string;
    };
  };
  flag: string;
  maps: {
    googleMaps: string;
    openStreetMaps: string;
  };
  population: number;
  gini?: {
    [key: string]: number;
  };
  fifa?: string;
  car?: {
    signs?: string[];
    side: 'right' | 'left';
  };
  timezones: string[];
  continents: string[];
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  coatOfArms?: {
    png?: string;
    svg?: string;
  };
  startOfWeek?: string;
  capitalInfo?: {
    latlng?: [number, number];
  };
  postalCode?: {
    format: string;
    regex: string;
  };
}

export interface GameState {
  score: number;
  round: number;
  maxRounds: number;
  mode: 'flag-to-map' | 'name-to-flag' | 'flag-to-name' | 'map-to-flag' | null;
  currentCountry: Country | null;
  options: Country[]; // For multiple choice modes
  showResult: boolean;
  lastGuessCorrect: boolean | null;
  selectedOptionCca3: string | null;
}
