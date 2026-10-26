# Telar

Tu oficina armada desde el primer minuto: páginas, tareas y conversaciones del equipo en un solo lugar, en español. Para equipos de hasta 10 personas.

## Probar en local

```bash
npm install
cp .env.example .env.local      # NEXT_PUBLIC_DATA=fake y NEXT_PUBLIC_DEMO=1 para probar sin backend
npm run dev
```

Con el modo demo, en `/login` aparece el equipo de ejemplo. Abre dos pestañas con personas distintas para probar el trabajo en conjunto.

## Pruebas

```bash
npx playwright test     # punta a punta, accesibilidad y móvil
npm run test:db         # migraciones y permisos contra un Postgres local
npm run lint
```

## Estructura

- `src/features/`: pantallas por área (páginas, tareas, chat, bandeja, ajustes)
- `src/data/api.ts`: todas las operaciones; hoy con datos en el navegador, mañana con Supabase sin cambiar pantallas
- `supabase/migrations/`: esquema, permisos (RLS) y lógica del servidor
- `replica/`: investigación, arquitectura, diseño, pruebas, paridad, reseñas, marca y lanzamiento
