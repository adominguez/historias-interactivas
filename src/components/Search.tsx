import { useState, useEffect } from 'react';

const Search = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]); // Almacena los resultados
  const [isLoading, setIsLoading] = useState(false); // Indicador de carga
  const [empty, setEmpty] = useState(false); // Indicador de resultados vacíos

  // Función de debounce
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (search.trim() !== '' && search.length > 3) {
        fetchStories(search); // Llama a la API cuando el usuario deja de escribir
      } else {
        setResults([]); // Limpia los resultados si el input está vacío
      }
    }, 300);

    return () => clearTimeout(debounceTimeout); // Limpia el timeout si el componente se desmonta o cambia el valor de búsqueda
  }, [search]);

  // Llamada a la API
  const fetchStories = async (query: string) => {
    setIsLoading(true);
    setEmpty(false);
    try {
      const response = await fetch(`/api/search-story?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }
      const data = await response.json();
      if (data.results.length === 0) {
        setEmpty(true);
      }
      setResults(data.results || []);
    } catch (error) {
      console.error('Error al buscar historias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-64">
      <form
        className="max-w-lg mx-auto"
        onSubmit={(e) => {
          e.preventDefault(); // Previene el comportamiento por defecto del formulario
        }}
      >
        <div className="relative w-full">
          <input
            type="search"
            id="search-dropdown"
            className="block p-2.5 pr-10 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-full border-s-gray-50 border-s-2 border border-gray-300 focus:ring-primary/90 ring-primary focus:border-primary/90 dark:bg-gray-700 dark:border-s-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
            placeholder="Encuentra tu historia"
            required
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)} // Actualiza el estado de búsqueda
          />
          <button
            type="submit"
            className="absolute top-0 end-0 p-2.5 text-sm font-medium h-full text-white bg-primary/90 rounded-e-full border border-primary/90 hover:bg-primary focus:ring-4 focus:outline-none focus:ring-primary/30 dark:bg-primary/60 dark:hover:bg-primary/60 dark:focus:ring-primary"
          >
            <svg
              className="w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
            <span className="sr-only">Search</span>
          </button>
        </div>
      </form>

      {/* Lista de resultados */}
      <div className='bg-white rounded-lg absolute z-50 shadow-md w-64 mt-4'>
        {isLoading && <p className="text-center mt-2 text-sm text-gray-500">Buscando...</p>}
        {empty && (
          <p className="p-2 text-sm text-gray-500 text-center m-0">No hay resultados, haz una nueva búsqueda</p>
        )}
        <ul>
          {results.map((story: any) => (
            <li
              key={story.slug}
              className="border-b last:border-none group first-of-type:rounded-t-lg last-of-type:rounded-b-lg overflow-hidden"
            >
              <a href={`/${story.slug}`} className="p-2 flex gap-2 items-center text-primary dark:text-primary/40 hover:bg-gray-800 dark:hover:bg-gray-800">
                <img
                  src={`https://res.cloudinary.com/dnxab4qma/image/upload/c_limit,h_32/f_auto/q_auto/v1/cuentos-interactivos/${story.slug}/${story.slug}.webp`}
                  width={32}
                  height={32}
                  alt={story.title}
                  sizes="100vw"
                  className="object-cover rounded-full w-8 h-8"
                />
                {story.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Search;
