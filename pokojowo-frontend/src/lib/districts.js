// Mirror of CITY_DISTRICTS in pokojowo-fastapi/app/core/locations.py.
// Suggestions only — districts are stored as free text so scraped
// listings with other district names are never rejected.
export const CITY_DISTRICTS = {
  Warszawa: [
    'Bemowo', 'Białołęka', 'Bielany', 'Mokotów', 'Ochota',
    'Praga-Południe', 'Praga-Północ', 'Rembertów', 'Śródmieście',
    'Targówek', 'Ursus', 'Ursynów', 'Wawer', 'Wesoła', 'Wilanów',
    'Włochy', 'Wola', 'Żoliborz',
  ],
  'Kraków': [
    'Stare Miasto', 'Grzegórzki', 'Prądnik Czerwony', 'Prądnik Biały',
    'Krowodrza', 'Bronowice', 'Zwierzyniec', 'Dębniki', 'Łagiewniki-Borek Fałęcki',
    'Swoszowice', 'Podgórze Duchackie', 'Bieżanów-Prokocim', 'Podgórze',
    'Czyżyny', 'Mistrzejowice', 'Bieńczyce', 'Wzgórza Krzesławickie', 'Nowa Huta',
  ],
  'Wrocław': ['Stare Miasto', 'Śródmieście', 'Krzyki', 'Fabryczna', 'Psie Pole'],
  'Poznań': ['Stare Miasto', 'Nowe Miasto', 'Wilda', 'Grunwald', 'Jeżyce'],
  'Gdańsk': [
    'Śródmieście', 'Wrzeszcz', 'Oliwa', 'Przymorze', 'Zaspa',
    'Brzeźno', 'Nowy Port', 'Orunia', 'Chełm', 'Piecki-Migowo',
  ],
  'Łódź': ['Bałuty', 'Górna', 'Polesie', 'Śródmieście', 'Widzew'],
};

export const CITIES = Object.keys(CITY_DISTRICTS);

export function districtsForCity(city) {
  return CITY_DISTRICTS[city] || [];
}
