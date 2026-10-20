# INVENTARIO — instrucciones para Claude

Sistema de inventario web (Next.js 15 + Supabase). Plan completo en `README.md`.

## Reglas de git (obligatorias en todas las sesiones)

- Hacer **muchísimos commits pequeños**, uno por cada parte lógica (una migración, una pantalla, un componente, una acción, config, etc.). Nunca un commit gigante.
- Autor y committer de **todos** los commits: `KratosNub777 <facundovera0702@gmail.com>`.
  - Verificar antes de commitear: `git config user.name` → `KratosNub777` y `git config user.email` → `facundovera0702@gmail.com`. Si no coinciden: `git config user.name "KratosNub777"` y `git config user.email "facundovera0702@gmail.com"`.
- Commits **a nombre del usuario**: no agregar línea `Co-Authored-By` ni otra atribución a Claude.
- Mensajes en español, cortos, en imperativo (ej. `Agrega migración de productos`).
- No hacer `push` sin que el usuario lo pida.

## Proyecto

- Repo git real: esta carpeta (`INVENTARIO/INVENTARIO`), remoto `https://github.com/KratosNub777/INVENTARIO.git`, rama `main`.
- Stack: Next.js 15 (App Router, TS), Tailwind, Supabase (Postgres + Auth + Storage), zod, exceljs, jspdf.
- El stock solo cambia vía la función SQL `registrar_movimiento`; eliminar productos = `activo = false`.
- Todos los usuarios son `admin` (solo 2 personas lo usan). Diseño: acento esmeralda único sobre neutros zinc, modo claro/oscuro automático, fuente Geist, iconos Phosphor, animaciones CSS que respetan `prefers-reduced-motion`; sin guiones largos (`—`) en textos visibles.
- Verificación en cada fase: `npm run lint` y `npm run build`.
