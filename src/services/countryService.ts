import axios from 'axios';
import type { Country } from '../types';

const API_URL = 'https://restcountries.com/v3.1';

export const CountryService = {
    getAllCountries: async (): Promise<Country[]> => {
        try {
            const response = await axios.get<Country[]>(
                `${API_URL}/all?fields=name,flags,latlng,cca2,cca3,translations,area,unMember,region,subregion`
            );
            // Keep only UN member states and countries with necessary game data.
            // Normalize flag URLs by ISO code to avoid inconsistent upstream flag assets.
            return response.data
                .filter(
                    c => c.unMember === true && c.latlng && c.latlng.length === 2 && c.name.common !== 'Antarctica'
                )
                .map((c) => {
                    const code = c.cca2?.toLowerCase();
                    if (!code || code.length !== 2) return c;

                    return {
                        ...c,
                        flags: {
                            ...c.flags,
                            svg: `https://flagcdn.com/${code}.svg`,
                            png: `https://flagcdn.com/w320/${code}.png`
                        }
                    };
                });
        } catch (error) {
            console.error('Error fetching countries:', error);
            return [];
        }
    },

    getRandomCountries: (countries: Country[], count: number): Country[] => {
        const shuffled = [...countries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },

    // Specific for Japanese names
    getJapaneseName: (country: Country): string => {
        return country.translations.jpn?.common || country.name.common;
    },

    getOptions: (correctCountry: Country, allCountries: Country[], count: number = 4): Country[] => {
        const distractors = allCountries.filter(c => c.cca3 !== correctCountry.cca3).sort(() => 0.5 - Math.random()).slice(0, count - 1);
        const options = [...distractors, correctCountry].sort(() => 0.5 - Math.random());
        return options;
    }
};
