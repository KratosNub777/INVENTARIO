# Inventario

Sistema de inventario web (responsivo) para una sola bodega: productos, stock, movimientos, categorías, proveedores, reportes Excel/PDF y usuarios con roles.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres + Auth + Storage) · zod · exceljs · jspdf.

## Puesta en marcha

1. Crear un proyecto en [Supabase](https://supabase.com).
2. Ejecutar en el SQL editor, en orden, `supabase/migrations/001…005_*.sql` (o `supabase db push` con la CLI). Opcional: `supabase/seed.sql` con datos de ejemplo.
3. Copiar `.env.example` a `.env.local` y completar las claves (Project Settings → API). `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor para invitar usuarios.
4. `npm install` y `npm run dev` → http://localhost:3000.
5. Crear el primer usuario en Supabase (Authentication → Users → Add user). Todo usuario nuevo queda como `admin`.

## Reglas del modelo

- El stock **nunca se edita a mano**: solo cambia con la función SQL `registrar_movimiento` (bloquea la fila, valida que no quede negativo, actualiza el stock y guarda el movimiento). Un trigger rechaza cualquier otro cambio.
- **Eliminar = desactivar** (`activo = false`); solo un admin puede hacerlo. Así se conserva el historial.
- Todos los usuarios son `admin` (lo fija el trigger de Auth, migración 007): solo lo usan 2 personas de confianza. El rol `operador` sigue existiendo en la base por si se necesita más adelante. Todo está protegido con RLS.
- Movimiento tipo `ajuste`: se ingresa el **stock contado**; se guarda la diferencia.

## Pantallas

Login · Dashboard · Productos (búsqueda, filtros, orden, paginación, imagen, historial) · Movimientos · Categorías · Proveedores · Reportes (inventario valorizado, movimientos por período, stock bajo; Excel y PDF) · Usuarios (admin).

## Despliegue

- **Vercel**: conectar el repo y definir las variables de `.env.example`.
- **Supabase**: el plan gratis se pausa tras 7 días sin uso; para producción conviene Pro (respaldos diarios).

## Desarrollo

```
npm run lint
npm run build
```
