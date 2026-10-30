// Modo de la app. Mientras no haya Supabase conectado (NEXT_PUBLIC_DATA=supabase), los datos viven
// en el navegador de cada visitante y la app es, por definición, una demo: así se puede publicar
// en Vercel sin configurar ninguna variable.
export const USING_SUPABASE = process.env.NEXT_PUBLIC_DATA === "supabase";
export const DEMO_MODE = !USING_SUPABASE || process.env.NEXT_PUBLIC_DEMO === "1";
