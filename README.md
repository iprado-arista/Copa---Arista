# Copa Interna Óptica Arista

Sistema de registro de referidos y ranking en vivo para la Copa Interna Óptica Arista 2026.

## Para publicarlo

Lee y sigue el archivo `GUIA-PUBLICACION.docx` paso a paso.

## Estructura

- `src/App.jsx` — Aplicación principal (formulario, ranking, panel admin)
- `src/supabase.js` — Conexión a la base de datos
- `src/main.jsx` — Punto de entrada de React
- `src/index.css` — Estilos
- `supabase-setup.sql` — Script para crear las tablas en Supabase
- `.env.example` — Variables de entorno (renombrar a `.env` y llenar para desarrollo local)

## Stack técnico

- React 18 + Vite
- Tailwind CSS
- Supabase (Postgres + Realtime)
- Lucide Icons

## Para desarrollo local (opcional)

```bash
npm install
cp .env.example .env
# editar .env con tus credenciales
npm run dev
```
