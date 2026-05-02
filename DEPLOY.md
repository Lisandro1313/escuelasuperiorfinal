# Desplegar Campus Norma — Modo gratis ($0/mes)

**Tiempo estimado: 25-30 minutos.**
**Costo fijo: USD 0/mes.** Solo pagás comisiones de MercadoPago por venta (~5-7%).

---

## Arquitectura

| Componente | Plataforma | Plan | Límite gratuito |
|---|---|---|---|
| **Frontend** (React + Vite) | [Vercel](https://vercel.com) | Free | 100GB bandwidth/mes |
| **Backend** (Express + Socket.IO) | [Render](https://render.com) | Free | 750h/mes — alcanza para 1 servicio 24/7 |
| **Base de datos** | [Turso](https://turso.tech) (libSQL/SQLite) | Free | 9GB storage, 1B reads/mes |
| **Storage de videos/PDFs** | [Supabase Storage](https://supabase.com) | Free | 1GB storage, 5GB bandwidth/mes |
| **Pagos** | [MercadoPago](https://mercadopago.com.ar) | Solo comisión por venta | — |

**Trade-offs honestos del free:**

- **Render free duerme** tras 15 min sin tráfico (~50s para despertar). Lo arreglamos con [UptimeRobot](https://uptimerobot.com) pingueando cada 5 min — gratis.
- **Supabase Storage 1GB** alcanza para ~30-60 videos comprimidos. Cuando se llene, plan Pro $25/mes.
- **Turso 9GB** es muchísimo — no lo vas a llenar jamás con DB pura.

---

## Las 5 cuentas que vas a crear

Andá creando cada una en otra pestaña. Son rápidas, todas con tu mail/Google/GitHub.

1. **GitHub** — ya tenés (`Lisandro1313/escuelasuperiorfinal`)
2. **MercadoPago Developers** — <https://www.mercadopago.com.ar/developers>
3. **Turso** — <https://turso.tech> (login con GitHub)
4. **Supabase** — <https://supabase.com> (login con GitHub)
5. **Render** — <https://render.com> (login con GitHub)
6. **Vercel** — <https://vercel.com> (login con GitHub)

---

## Paso 1 — Turso (DB) — 3 min

1. <https://turso.tech> → Sign in con GitHub
2. **Create database** → nombre: `campus-norma` → región: cualquiera (Oregon o São Paulo)
3. Una vez creada, click **"Create token"** o **"Database tokens" → Generate**:
   - Permisos: Full Access
   - Expiration: Never
4. **Anotá estos dos valores**:
   - **Database URL**: `libsql://campus-norma-tunick.turso.io` (algo así)
   - **Auth Token**: `eyJ...` (un JWT largo)

> Las tablas las crea solo el backend al primer arranque (lee `init.sql`).

---

## Paso 2 — Supabase (storage) — 5 min

1. <https://supabase.com> → New project → nombre `campus-norma`, password cualquiera
2. Esperar 2 min hasta que el proyecto esté listo
3. **Project Settings → API** → anotá:
   - **Project URL**: `https://xxx.supabase.co`
   - **service_role secret** (NO el anon key): `eyJ...`
4. **Storage → New bucket**:
   - Nombre: `uploads`
   - **Public bucket: ✅ activado** (los videos tienen que ser accesibles vía URL)
   - File size limit: 500MB
5. Listo.

---

## Paso 3 — MercadoPago Developers — 5 min

1. <https://www.mercadopago.com.ar/developers/panel/app>
2. **Crear aplicación**:
   - Nombre: `Campus Norma`
   - Productos: ✅ Checkout Pro
3. En **Credenciales** vas a ver dos pestañas:
   - **Credenciales de prueba** (TEST-...) → empezá con estas
   - **Credenciales de producción** (APP_USR-...) → cuando estés listo para cobrar
4. Anotá:
   - **Access Token**
   - **Public Key**
5. **Webhooks → Configurar notificaciones**:
   - URL: dejala vacía por ahora (paso 6)
   - Eventos: ✅ Pagos
   - Generar y guardar el **Secret**

---

## Paso 4 — Backend en Render — 5 min

1. <https://render.com> → **New → Blueprint**
2. **Connect repo** → `Lisandro1313/escuelasuperiorfinal` → **Apply**
3. Render lee `render.yaml` y muestra `campus-norma-backend` (free).
4. Te pide pegar las env vars `sync: false`. Pegá:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | Inventá una password fuerte (anotala) |
| `TURSO_DATABASE_URL` | el URL del paso 1 |
| `TURSO_AUTH_TOKEN` | el token del paso 1 |
| `SUPABASE_URL` | URL del paso 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret del paso 2 |
| `MERCADOPAGO_ACCESS_TOKEN` | del paso 3 (empezá con TEST-) |
| `MERCADOPAGO_PUBLIC_KEY` | del paso 3 |
| `MERCADOPAGO_WEBHOOK_SECRET` | del paso 3 |
| `FRONTEND_URL` | dejá vacío por ahora — lo completás en el paso 5 |
| `BACKEND_URL` | dejá vacío por ahora |

5. **Apply** → Render compila y deploya. ~5 min.
6. Cuando termine, anotá la URL del backend, ej. `https://campus-norma-backend.onrender.com`.
7. **Volvé a Settings → Environment** y completá:
   - `BACKEND_URL` = `https://campus-norma-backend.onrender.com`

8. Verificá: abrí `https://campus-norma-backend.onrender.com/api/health` en el browser. Tenés que ver `{"status":"healthy",...}` o `"degraded"` con la lista de lo que falta.

---

## Paso 5 — Frontend en Vercel — 3 min

1. <https://vercel.com> → **Add New → Project** → importá el repo `escuelasuperiorfinal`
2. Configurá:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ← importante
   - **Build Command**: dejar el default (`npm run build`)
   - **Output Directory**: `dist`
3. **Environment Variables**:
   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | la URL del backend de Render (paso 4) |
   | `VITE_MERCADOPAGO_PUBLIC_KEY` | la public key de MP (paso 3) |
4. **Deploy**. ~2 min.
5. Cuando termine, anotá la URL del frontend, ej. `https://campus-norma.vercel.app`.

6. **Volvé a Render → backend → Settings → Environment** y completá:
   - `FRONTEND_URL` = `https://campus-norma.vercel.app`
7. Render → **Manual Deploy → Clear cache & deploy** para que tome la nueva env var.

---

## Paso 6 — Pegar webhook URL en MercadoPago — 1 min

1. <https://www.mercadopago.com.ar/developers/panel/app> → tu app → **Webhooks**
2. URL: `https://campus-norma-backend.onrender.com/api/payments/webhook`
3. Eventos: ✅ Pagos
4. Guardar.

---

## Paso 7 — UptimeRobot para que Render no duerma — 2 min

1. <https://uptimerobot.com> → Sign up free
2. **Add new monitor**:
   - Type: HTTP(s)
   - URL: `https://campus-norma-backend.onrender.com/api/health`
   - Interval: 5 minutes
3. Save. Listo, el backend nunca duerme más de 5 min.

---

## Paso 8 — Probar todo — 5 min

1. Abrí el frontend: `https://campus-norma.vercel.app`
2. **Login admin**: `admin@campusnorma.com` / la `ADMIN_PASSWORD` que pusiste
3. Como admin, registrá la cuenta de Norma como **profesor** (o que ella se registre con el código `PROF2024`)
4. Norma:
   - "Crear curso" con precio (ej. $1500)
   - "Mis cursos" → "Gestionar"
   - Crear módulo → crear lección tipo **video** → click **"⬆️ Subir desde mi PC"** → MP4 → guardar
   - El video se subió a Supabase Storage (no al server)
5. **Probar el pago** (con tarjetas test de MP):
   - Logout, registrate como alumno
   - Buscá el curso → "💳 Comprar Curso - $1500"
   - En MercadoPago usá tarjeta test: `4509 9535 6623 3704`, CVV `123`, vto `11/30`, DNI `12345678`, nombre **`APRO`** (para aprobar)
   - Tras pagar, te redirige a `/payment/success` → polling al backend → "✅ Pago confirmado, Ir al curso"
   - Ya ves el video.

---

## Pasar a "cobrar de verdad"

1. Volver al panel de MP → Credenciales → **Producción**
2. Copiar `Access Token` (APP_USR-...) y `Public Key` de producción
3. Render → backend → Environment → reemplazar `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY`
4. Vercel → frontend → Settings → Environment → reemplazar `VITE_MERCADOPAGO_PUBLIC_KEY`
5. Manual deploy en ambos.

---

## Dominio propio (opcional)

Si comprás `campusnorma.com`:

- **Vercel** → Settings → Domains → Add `campusnorma.com` y `www.campusnorma.com`
- **Render** → backend → Settings → Custom Domain → Add `api.campusnorma.com`
- Actualizar `FRONTEND_URL` en Render, `VITE_API_URL` en Vercel
- Actualizar URL del webhook en MercadoPago

SSL automático en ambas plataformas.

---

## Troubleshooting

| Síntoma | Fix |
|---|---|
| `/api/health` muestra `configMissing: [...]` | Render → backend → Environment → completar las que faltan + Manual deploy |
| "Network Error" en el browser | Verificar `VITE_API_URL` en Vercel apunta al backend de Render |
| El video no carga | Verificar que el bucket de Supabase es **public** |
| Pago "no se pudo crear preferencia" | Access token de MP inválido o cuenta sin Checkout Pro habilitado |
| El alumno paga pero no ve el curso | Webhook no configurado en MP. Volver al paso 6 |
| Render se duerme | Verificar que UptimeRobot está activo (paso 7) |

Logs en vivo:
- Backend: Render → service → tab Logs
- Frontend: Vercel → project → Deployments → último deploy → Logs

---

## ¿Y si crece y necesito más?

- **Supabase Storage llena (1GB)** → Plan Pro $25/mes (8GB) o usar [Cloudflare R2](https://www.cloudflare.com/products/r2/) (10GB free + bandwidth ilimitado)
- **Render free se queda corto (CPU/memoria)** → Starter $7/mes (sin sleep, más recursos)
- **Turso llena (9GB)** → muy difícil. Plan Scaler $29/mes da 100GB.
- **Tráfico Vercel >100GB/mes** → Plan Pro $20/mes.

Pero para empezar y entregar a Norma, gratis sirve.
