# Desplegar Campus Norma a producción

**Tiempo estimado: 15 minutos.**
**Costo: USD 7/mes** (backend en plan starter de Render — necesario para que la DB y los videos no se pierdan en cada deploy. El frontend es gratis).

---

## Resumen del setup

- **Plataforma**: Render.com (lee `render.yaml` y crea backend + frontend + disco persistente automáticamente)
- **Pagos**: MercadoPago (Argentina)
- **Cuentas que vas a necesitar**: GitHub (ya tenés), Render, MercadoPago (developer)

---

## Paso 1 — Cuenta en MercadoPago Developers (5 min)

1. Andá a <https://www.mercadopago.com.ar/developers/panel/app>
2. Iniciá sesión con tu cuenta de MercadoPago (la misma que usás para vender)
3. Click en **"Crear aplicación"**
   - Nombre: `Campus Norma`
   - Modelo de integración: `Pagos online`
   - Productos: marcar **Checkout Pro**
4. Una vez creada, vas a la solapa **"Credenciales"** y vas a ver:
   - **Credenciales de prueba** (TEST-...) → para probar sin plata real
   - **Credenciales de producción** (APP_USR-...) → para cobrar de verdad

   Anotá estos cuatro valores (de las credenciales que vas a usar — empezá con las de prueba):
   - `Access Token`
   - `Public Key`

5. En el menú izquierdo: **"Webhooks"** → **"Configurar notificaciones"**:
   - URL: dejala vacía por ahora, la completamos en el paso 4
   - Eventos: marcar **"Pagos"** (`payment`)
   - Generar y guardar el **Secret** (lo vas a necesitar)

---

## Paso 2 — Cuenta en Render y crear el blueprint (3 min)

1. Andá a <https://render.com> → **Sign up con GitHub**
2. Una vez logueado, **Dashboard → New → Blueprint**
3. **Connect GitHub repository** → seleccioná `Lisandro1313/escuelasuperiorfinal`
4. Render detecta `render.yaml` y muestra los servicios que va a crear:
   - `campus-norma-backend` (web service, plan **starter $7/mes**)
   - `campus-norma-frontend` (static site, plan free)
   - Disco persistente de 5GB
5. Click en **"Apply"**

Render te pide que pegues los valores que tienen `sync: false`. Pegalos:

### Backend (`campus-norma-backend`)
| Variable | Qué poner |
|---|---|
| `ADMIN_PASSWORD` | Inventá una password fuerte. Ej: `MiPass2026!` (anotala — la vas a usar para entrar como admin) |
| `MERCADOPAGO_ACCESS_TOKEN` | El que copiaste del paso 1 |
| `MERCADOPAGO_PUBLIC_KEY` | La que copiaste del paso 1 |
| `MERCADOPAGO_WEBHOOK_SECRET` | El que generaste del paso 1 |
| `FRONTEND_URL` | Dejá `https://campus-norma-frontend.onrender.com` (lo confirmamos en el paso 3) |
| `BACKEND_URL` | Dejá `https://campus-norma-backend.onrender.com` |

### Frontend (`campus-norma-frontend`)
| Variable | Qué poner |
|---|---|
| `VITE_API_URL` | `https://campus-norma-backend.onrender.com` |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | La misma public key del paso 1 |

Click **"Create services"**. Render arranca a buildear los dos servicios. Tarda unos 5 minutos.

---

## Paso 3 — Confirmar las URLs reales y reiniciar (2 min)

Cuando termine el primer deploy:

1. Anotá las URLs reales que te dio Render. Suelen ser:
   - Backend: `https://campus-norma-backend.onrender.com`
   - Frontend: `https://campus-norma-frontend.onrender.com`

   Si Render le agregó un sufijo aleatorio (ej. `campus-norma-backend-x4z9`), copiá las URLs reales.

2. Si las URLs son distintas a las que pegaste antes, andá a **cada servicio → Settings → Environment** y actualizá:
   - Backend: `FRONTEND_URL` y `BACKEND_URL`
   - Frontend: `VITE_API_URL`
3. **Manual Deploy → Clear build cache & deploy** en cada servicio. Espera 3 min.

---

## Paso 4 — Pegar la URL del webhook en MercadoPago (1 min)

1. Volvé a <https://www.mercadopago.com.ar/developers/panel/app> → tu app → **Webhooks**
2. Pegá la URL del webhook:
   ```
   https://campus-norma-backend.onrender.com/api/payments/webhook
   ```
3. Guardar.

---

## Paso 5 — Probar que funciona (3 min)

1. Abrí el frontend: `https://campus-norma-frontend.onrender.com`
2. **Login como admin**: `admin@campusnorma.com` / la `ADMIN_PASSWORD` que pusiste en el paso 2
3. Como admin podés también crear cursos. O bien:
   - Registrá un usuario `Norma` y cambiale el rol a `profesor` (vas a la pestaña Admin → Usuarios)
   - O directamente hacé que Norma se registre eligiendo "Profesor" con uno de estos códigos: `PROF2024`, `DOCENTE123`, `MAESTRO456` (están hardcodeados en `server.js:241` por ahora — cambialos cuando quieras)
4. Como profesor:
   - "Crear curso" → poner precio (ej. $1500)
   - "Mis cursos" → "Gestionar"
   - Crear módulo → crear lección → tipo **video** → click **"⬆️ Subir desde mi PC"** → elegí un MP4 → guardar
5. **Probar el pago** (con tarjetas de prueba de MP):
   - Logout → registrate como un alumno cualquiera
   - Buscá el curso → "💳 Comprar Curso - $1500"
   - En MercadoPago usá una **tarjeta de prueba**:
     - Visa: `4509 9535 6623 3704`
     - CVV: `123`, Vencimiento: `11/30`, DNI: `12345678`, nombre: `APRO` (para aprobar) o `OTHE` (para rechazar)
   - Tras pagar, MP te redirige a `/payment/success` → la página hace polling al backend → "✅ Pago confirmado, Ir al curso"
   - Ahora ves los módulos y reproducís el video.

---

## Pasar a "cobrar de verdad"

Cuando esté todo OK:

1. Volvé al panel de MercadoPago → Credenciales → cambiá a **"Producción"**
2. Copiá los nuevos `Access Token` y `Public Key` (empiezan con `APP_USR-...`)
3. En Render → backend → Environment → reemplazá `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY` por las de producción
4. En Render → frontend → Environment → reemplazá `VITE_MERCADOPAGO_PUBLIC_KEY`
5. Manual Deploy en ambos.

Listo. Cobrás de verdad.

---

## Dominio propio (opcional)

Si comprás `campusnorma.com` o `escuelanorma.com.ar`:

1. Render → frontend → Settings → Custom Domain → agregar `campusnorma.com` y `www.campusnorma.com`
2. Render te da unos registros DNS (CNAME). Los pegás en tu proveedor de dominio.
3. Render → backend → Custom Domain → agregar `api.campusnorma.com` (o lo que prefieras)
4. Actualizar `FRONTEND_URL`, `BACKEND_URL` y `VITE_API_URL` en Render con los dominios nuevos.
5. Actualizar la URL del webhook en MercadoPago.

SSL es automático en Render.

---

## Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| `/api/health` muestra `configMissing: [...]` | Faltan env vars | Render → backend → Environment → completar las que faltan |
| Pago "no se pudo crear preferencia" | Access token inválido o de cuenta sin productos habilitados | Verificar credenciales MP, regenerar |
| Webhook no inscribe al alumno | URL del webhook mal configurada en MP | Volver al paso 4. Verificar logs en Render → backend → Logs |
| Frontend muestra "Network Error" | `VITE_API_URL` mal seteado | Confirmar que apunta al backend de Render |
| El backend duerme | Render free tier duerme tras 15 min | Ya está en plan starter, no debería pasar |
| La DB / videos se borraron tras un deploy | Falta el disco persistente | Render → backend → Disks → confirmar que `campus-norma-data` está montado en `/var/data` |

Logs en vivo: **Render → cada servicio → Logs** (tail real-time).

---

## Costos

- **Render backend (starter)**: USD 7/mes
- **Render frontend (static free)**: USD 0
- **Render disco persistente 5GB**: incluido en starter
- **MercadoPago**: comisión por transacción (~5-7% según el medio de pago, no hay costo fijo)

**Total fijo: USD 7/mes.**

Si querés ahorrar, podés bajar el disco a 1GB ($0.25/mes ahorrados) editando `render.yaml` línea `sizeGB`.
