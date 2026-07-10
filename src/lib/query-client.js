import { QueryClient } from '@tanstack/react-query'

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Caché entre vistas: los datos se descargan una vez y se reutilizan al navegar,
      // en vez de re-descargar decenas de miles de filas en cada cambio de sección.
      staleTime: 5 * 60 * 1000,      // 5 min "frescos" → sin refetch al cambiar de vista
      gcTime: 30 * 60 * 1000,        // se conservan en memoria 30 min
      // initialData:[] de los hooks se marca como caducado al montar, así la primera
      // carga sí busca datos; después, el staleTime evita re-descargas.
      initialDataUpdatedAt: 0,
    },
  },
})
