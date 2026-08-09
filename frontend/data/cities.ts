export interface City {
  name: string;
  country: string;
}

export const POPULAR_CITIES: City[] = [
  { name: 'Madrid', country: 'España' },
  { name: 'Barcelona', country: 'España' },
  { name: 'Sevilla', country: 'España' },
  { name: 'Valencia', country: 'España' },
  { name: 'Granada', country: 'España' },
  { name: 'Bilbao', country: 'España' },
  { name: 'París', country: 'Francia' },
  { name: 'Niza', country: 'Francia' },
  { name: 'Roma', country: 'Italia' },
  { name: 'Milán', country: 'Italia' },
  { name: 'Venecia', country: 'Italia' },
  { name: 'Florencia', country: 'Italia' },
  { name: 'Nápoles', country: 'Italia' },
  { name: 'Londres', country: 'Reino Unido' },
  { name: 'Edimburgo', country: 'Reino Unido' },
  { name: 'Ámsterdam', country: 'Países Bajos' },
  { name: 'Berlín', country: 'Alemania' },
  { name: 'Múnich', country: 'Alemania' },
  { name: 'Praga', country: 'República Checa' },
  { name: 'Viena', country: 'Austria' },
  { name: 'Budapest', country: 'Hungría' },
  { name: 'Lisboa', country: 'Portugal' },
  { name: 'Oporto', country: 'Portugal' },
  { name: 'Atenas', country: 'Grecia' },
  { name: 'Santorini', country: 'Grecia' },
  { name: 'Dublín', country: 'Irlanda' },
  { name: 'Zúrich', country: 'Suiza' },
  { name: 'Copenhague', country: 'Dinamarca' },
  { name: 'Estocolmo', country: 'Suecia' },
  { name: 'Oslo', country: 'Noruega' },
  { name: 'Helsinki', country: 'Finlandia' },
  { name: 'Nueva York', country: 'Estados Unidos' },
  { name: 'Los Ángeles', country: 'Estados Unidos' },
  { name: 'Miami', country: 'Estados Unidos' },
  { name: 'Tokio', country: 'Japón' },
  { name: 'Kioto', country: 'Japón' },
  { name: 'Osaka', country: 'Japón' },
  { name: 'Pekín', country: 'China' },
  { name: 'Sídney', country: 'Australia' },
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'Ciudad de México', country: 'México' },
  { name: 'Río de Janeiro', country: 'Brasil' },
  { name: 'Dubái', country: 'Emiratos Árabes Unidos' },
  { name: 'Estambul', country: 'Turquía' },
  { name: 'El Cairo', country: 'Egipto' }
];

export const searchCities = (query: string): City[] => {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();
  return POPULAR_CITIES.filter(
    c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  ).slice(0, 6);
};
