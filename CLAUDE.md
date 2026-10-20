# INVENTARIO: guía para Claude

Sistema de inventario web para una bodega, usado por 2 personas. Next.js 15 (App Router, TS) + Supabase. Esta guía resume el sistema para no tener que leer todo el código: confía en ella y abre solo los archivos que vayas a tocar. **Si cambias algo estructural, actualiza este archivo en el mismo trabajo.**

## Reglas de git (obligatorias)

- **Muchísimos commits pequeños**, uno por parte lógica (migración, pantalla, componente, acción, config). Nunca uno gigante.
- Autor y committer: `KratosNub777 <facundovera0702@gmail.com>`. Comprueba `git config user.name` / `user.email` y corrígelos si no coinciden.
- Commits a nombre del usuario: **sin** línea `Co-Authored-By` ni atribución a Claude.
- Mensajes en español, cortos, imperativo (`Agrega migración de productos`).
- `push` solo cuando el usuario lo pida. Antes de subir, verifica que no haya claves ni la URL de Supabase en archivos versionados (`.env.local` está en `.gitignore`; solo `.env.example` se versiona).
- Repo real: esta carpeta (`INVENTARIO/INVENTARIO`), remoto `https://github.com/KratosNub777/INVENTARIO.git`, rama `main`. La carpeta padre NO es repo: usa `git -C <ruta>` si el cwd cambia.

## Stack y convenciones

- Next.js 15 + Tailwind v4 + Supabase (Postgres, Auth, Storage) + zod + exceljs + jspdf/jspdf-autotable + `@phosphor-icons/react`. Sin shadcn, TanStack Table ni React Hook Form (decisión consciente: filtros y paginación en servidor con `searchParams`).
- En Next 15, `params` y `searchParams` son **Promesas** (`await`).
- Mutaciones con **Server Actions** en `src/actions/*.ts`. Patrón: `getSesion()`/`requireAdmin()` → `validar(schema, formData, rutaDeError)` → consulta Supabase → `revalidatePath` → `redirect`. Los errores se muestran con `fallar(ruta, mensaje)` (redirige a `?error=...`, lo pinta `<Aviso/>`). `redirect()` lanza una excepción: **nunca dentro de try/catch**.
- El cliente Supabase **no está tipado**: las consultas devuelven `any` y se castean a las interfaces de `src/types/database.ts` (escritas a mano).
- PostgREST no compara dos columnas: "stock bajo" usa la vista `v_stock_bajo`.
- Idioma de UI y mensajes: español (es-CL, CLP). Sin guiones largos `—` en textos visibles.

## Diseño

Un solo acento esmeralda sobre neutros zinc; modo claro/oscuro automático (`dark:` por `prefers-color-scheme`); fuente Geist (`next/font`); iconos Phosphor (`/dist/ssr` en componentes de servidor, paquete normal en los `"use client"`). Radios: botones e inputs `rounded-lg`, tarjetas `rounded-2xl`. Las clases reutilizables viven en `src/app/globals.css` (`.btn`, `.btn-sec`, `.btn-peligro`, `.input`, `.label`, `.card`, `.tabla`, `.chip`, `.titulo`, `.subtitulo`, `.esqueleto`, `.entrada`, `.escalonado`). Animaciones solo CSS (+ `Contador`), todas apagadas con `prefers-reduced-motion`. Contraste: botón primario `bg-emerald-700`.

## Mapa del código (`src/`)

- `middleware.ts` + `lib/supabase/middleware.ts`: exige sesión; sin usuario → `/login`, con usuario en `/login` → `/`.
- `lib/supabase/server.ts` (cliente con cookies), `lib/supabase/admin.ts` (service role, solo servidor, para invitar usuarios).
- `lib/auth.ts`: `getSesion()` (usuario + perfil, desactivado → logout) y `requireAdmin()`.
- `lib/util.ts`: `fallar`, `dinero` (CLP), `cantidad`, `fechaHora`. `lib/validaciones/index.ts`: esquemas zod + `validar()`.
- `lib/exportar/excel.ts` y `pdf.ts`: reciben `Tabla {titulo, columnas, filas}`. `app/api/exportar/route.ts`: `GET ?tipo=inventario|movimientos|stock-bajo&formato=xlsx|pdf[&desde&hasta]`, exige sesión.
- `actions/`: `auth` (login/logout), `productos` (crear con stock inicial vía RPC + imagen a Storage, actualizar, desactivar), `movimientos` (RPC), `categorias`, `proveedores`, `usuarios` (invitar por email, activar/desactivar).
- `app/(auth)/login`: pantalla de login. `app/(panel)/`: `layout.tsx` (sidebar en escritorio, barra inferior en móvil), `template.tsx` (anima cada navegación), `loading.tsx` (esqueleto), y páginas: `page.tsx` (dashboard), `productos/` (listado con búsqueda/filtros/orden/paginación de 20, `nuevo`, `[id]` con edición e historial), `movimientos/` (registrar + historial filtrable, 200 filas), `categorias/`, `proveedores/`, `reportes/`, `usuarios/`.
- `components/`: `nav.tsx` (cliente, rutas activas), `form-producto.tsx`, `aviso.tsx`, `vacio.tsx`, `contador.tsx` (cifras animadas).

## Base de datos (Supabase)

Migraciones en `supabase/migrations/` (001 a 007), aplicadas al proyecto Supabase llamado **INVENTARIO** (obtén su id con `list_projects`; no lo escribas en el repo). Al cambiar la base: aplica con `apply_migration` **y** guarda el archivo numerado nuevo en `supabase/migrations/`. Revisa `get_advisors` (seguridad) después. `supabase/seed.sql` (datos de ejemplo) NO está cargado.

- Tablas: `perfiles` (id = auth.users.id, nombre, rol, activo), `categorias`, `proveedores`, `productos` (sku único, stock_actual, stock_minimo, imagen_url, `activo` = borrado lógico), `movimientos` (tipo entrada/salida/ajuste, stock_anterior/nuevo, motivo, usuario_id). Vistas: `v_valor_inventario`, `v_stock_bajo`. Bucket público `productos`.
- **El stock nunca se edita a mano.** Solo cambia con la función `registrar_movimiento(producto_id, tipo, cantidad, motivo)` (security definer, bloquea la fila, rechaza stock negativo, guarda el movimiento). Un trigger en `productos` rechaza cualquier otro cambio de stock y fuerza stock 0 al insertar. En `ajuste`, `cantidad` es el **stock contado** y se guarda la diferencia con signo.
- **Eliminar producto = `activo = false`** (no hay DELETE). Nada se borra del historial.
- **Roles:** todos los usuarios son `admin` (migración 007: default y trigger `crear_perfil`). El rol `operador` existe en el esquema pero no se usa; la UI ya no ofrece elegir rol. RLS activo en todas las tablas con `es_activo()` / `es_admin()`.
- Funciones auxiliares sensibles (`crear_perfil`, `es_*`) tienen `EXECUTE` revocado a `anon`; quedan 3 advertencias del advisor que son intencionales (`es_activo`, `es_admin`, `registrar_movimiento` para `authenticated`).

## Entorno

- `.env.local` (local, ignorado por git): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; opcional `SUPABASE_SERVICE_ROLE_KEY` (solo para invitar usuarios; el usuario debe pegarla, Claude no puede leerla). Plantilla en `.env.example`.
- Comandos: `npm run dev`, `npm run lint`, `npm run build` (ambos deben pasar; el build necesita las dos variables públicas, aunque sean de relleno).
- Para probar en navegador: Playwright está en el scratchpad de sesiones previas; la app requiere un usuario creado en Supabase (Authentication → Users).

## Trampas conocidas (Windows)

- En la herramienta Bash, los heredocs largos con comillas pueden fallar con "unexpected EOF": crea archivos con la herramienta Write y usa Bash solo para git.
- El cwd puede resetearse a la carpeta padre entre llamadas: usa rutas absolutas o `git -C`.
- Los avisos "LF will be replaced by CRLF" de git son inofensivos.
- Edit/Write exigen haber leído el archivo antes en la sesión.

## Estado y pendientes

- Hecho: todo el plan original (login, dashboard, productos, movimientos, categorías, proveedores, reportes Excel/PDF, usuarios), migraciones aplicadas y probadas por SQL, rediseño con animaciones, todo subido a `main`.
- Pendiente (depende del usuario): crear el primer usuario en Supabase, pegar `SUPABASE_SERVICE_ROLE_KEY` (local y Vercel), desplegar en Vercel y poner la Site URL en Supabase Auth, probar el flujo completo en navegador (crear producto, entrada/salida, exportar, ver móvil).
- Límites conocidos: filtros de fecha en UTC; la invitación por correo no tiene pantalla para fijar contraseña (alternativa: crear el usuario desde el panel de Supabase con "Auto Confirm"); la app aún no se probó de punta a punta con un usuario real.
