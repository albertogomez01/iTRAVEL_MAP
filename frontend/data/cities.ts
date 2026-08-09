export interface City {
  name: string;
  country: string;
}

export const POPULAR_CITIES: City[] = [
  // España & Portugal
  { name: 'Madrid', country: 'España' },
  { name: 'Barcelona', country: 'España' },
  { name: 'Sevilla', country: 'España' },
  { name: 'Valencia', country: 'España' },
  { name: 'Málaga', country: 'España' },
  { name: 'Granada', country: 'España' },
  { name: 'Bilbao', country: 'España' },
  { name: 'Santiago de Compostela', country: 'España' },
  { name: 'Córdoba', country: 'España' },
  { name: 'San Sebastián', country: 'España' },
  { name: 'Palma de Mallorca', country: 'España' },
  { name: 'Las Palmas', country: 'España' },
  { name: 'Alicante', country: 'España' },
  { name: 'Zaragoza', country: 'España' },
  { name: 'Toledo', country: 'España' },
  { name: 'Salamanca', country: 'España' },
  { name: 'Lisboa', country: 'Portugal' },
  { name: 'Oporto', country: 'Portugal' },
  { name: 'Faro (Algarve)', country: 'Portugal' },
  { name: 'Sintra', country: 'Portugal' },
  { name: 'Funchal (Madeira)', country: 'Portugal' },

  // Italia, Francia, Grecia
  { name: 'Roma', country: 'Italia' },
  { name: 'Milán', country: 'Italia' },
  { name: 'Venecia', country: 'Italia' },
  { name: 'Florencia', country: 'Italia' },
  { name: 'Nápoles', country: 'Italia' },
  { name: 'Bolonia', country: 'Italia' },
  { name: 'Turín', country: 'Italia' },
  { name: 'Verona', country: 'Italia' },
  { name: 'Palermo (Sicilia)', country: 'Italia' },
  { name: 'Cagliari (Cerdeña)', country: 'Italia' },
  { name: 'París', country: 'Francia' },
  { name: 'Niza', country: 'Francia' },
  { name: 'Lyon', country: 'Francia' },
  { name: 'Marsella', country: 'Francia' },
  { name: 'Burdeos', country: 'Francia' },
  { name: 'Estrasburgo', country: 'Francia' },
  { name: 'Toulouse', country: 'Francia' },
  { name: 'Atenas', country: 'Grecia' },
  { name: 'Santorini', country: 'Grecia' },
  { name: 'Míkonos', country: 'Grecia' },
  { name: 'Salónica', country: 'Grecia' },

  // Europa Central & Norte
  { name: 'Londres', country: 'Reino Unido' },
  { name: 'Edimburgo', country: 'Reino Unido' },
  { name: 'Mánchester', country: 'Reino Unido' },
  { name: 'Oxford', country: 'Reino Unido' },
  { name: 'Dublín', country: 'Irlanda' },
  { name: 'Ámsterdam', country: 'Países Bajos' },
  { name: 'Róterdam', country: 'Países Bajos' },
  { name: 'Bruselas', country: 'Bélgica' },
  { name: 'Brujas', country: 'Bélgica' },
  { name: 'Gante', country: 'Bélgica' },
  { name: 'Berlín', country: 'Alemania' },
  { name: 'Múnich', country: 'Alemania' },
  { name: 'Fráncfort', country: 'Alemania' },
  { name: 'Hamburgo', country: 'Alemania' },
  { name: 'Colonia', country: 'Alemania' },
  { name: 'Zúrich', country: 'Suiza' },
  { name: 'Ginebra', country: 'Suiza' },
  { name: 'Viena', country: 'Austria' },
  { name: 'Salzburgo', country: 'Austria' },
  { name: 'Praga', country: 'República Checa' },
  { name: 'Budapest', country: 'Hungría' },
  { name: 'Varsovia', country: 'Polonia' },
  { name: 'Cracovia', country: 'Polonia' },
  { name: 'Copenhague', country: 'Dinamarca' },
  { name: 'Estocolmo', country: 'Suecia' },
  { name: 'Oslo', country: 'Noruega' },
  { name: 'Helsinki', country: 'Finlandia' },
  { name: 'Reikiavik', country: 'Islandia' },

  // América del Norte y Caribe
  { name: 'Nueva York', country: 'Estados Unidos' },
  { name: 'Los Ángeles', country: 'Estados Unidos' },
  { name: 'Miami', country: 'Estados Unidos' },
  { name: 'San Francisco', country: 'Estados Unidos' },
  { name: 'Las Vegas', country: 'Estados Unidos' },
  { name: 'Chicago', country: 'Estados Unidos' },
  { name: 'Washington D.C.', country: 'Estados Unidos' },
  { name: 'Boston', country: 'Estados Unidos' },
  { name: 'Toronto', country: 'Canadá' },
  { name: 'Vancouver', country: 'Canadá' },
  { name: 'Montreal', country: 'Canadá' },
  { name: 'Ciudad de México', country: 'México' },
  { name: 'Cancún', country: 'México' },
  { name: 'Guadalajara', country: 'México' },
  { name: 'La Habana', country: 'Cuba' },
  { name: 'San Juan', country: 'Puerto Rico' },
  { name: 'Punta Cana', country: 'República Dominicana' },

  // América del Sur
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'Bariloche', country: 'Argentina' },
  { name: 'Río de Janeiro', country: 'Brasil' },
  { name: 'São Paulo', country: 'Brasil' },
  { name: 'Santiago de Chile', country: 'Chile' },
  { name: 'Lima', country: 'Perú' },
  { name: 'Cusco', country: 'Perú' },
  { name: 'Bogotá', country: 'Colombia' },
  { name: 'Cartagena de Indias', country: 'Colombia' },
  { name: 'Medellín', country: 'Colombia' },
  { name: 'Montevideo', country: 'Uruguay' },

  // Asia y Oceanía
  { name: 'Tokio', country: 'Japón' },
  { name: 'Kioto', country: 'Japón' },
  { name: 'Osaka', country: 'Japón' },
  { name: 'Pekín', country: 'China' },
  { name: 'Shanghái', country: 'China' },
  { name: 'Hong Kong', country: 'China' },
  { name: 'Seúl', country: 'Corea del Sur' },
  { name: 'Bangkok', country: 'Tailandia' },
  { name: 'Phuket', country: 'Tailandia' },
  { name: 'Singapur', country: 'Singapur' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Sídney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Auckland', country: 'Nueva Zelanda' },

  // Oriente Medio y África
  { name: 'Dubái', country: 'Emiratos Árabes Unidos' },
  { name: 'Abu Dabi', country: 'Emiratos Árabes Unidos' },
  { name: 'Estambul', country: 'Turquía' },
  { name: 'El Cairo', country: 'Egipto' },
  { name: 'Marrakech', country: 'Marruecos' },
  { name: 'Casablanca', country: 'Marruecos' },
  { name: 'Ciudad del Cabo', country: 'Sudáfrica' }
];

export const searchCities = (query: string): City[] => {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();
  return POPULAR_CITIES.filter(
    c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  ).slice(0, 8);
};
