# Nexora Hotel — Frontend

React 18 + Vite 5 + Tailwind 3 (mismo stack que DemoPV y Citas). Arquitectura y decisiones en
[nexora-hotel-backend/docs](../nexora-hotel-backend/docs/01-ANALISIS-Y-ARQUITECTURA.md).

## Arranque

```bash
npm install
npm run dev      # http://localhost:5180 (proxy /api → backend en :8090)
npm test         # Vitest: validaciones, permisos y render de todas las pantallas
npm run build    # dist/
```

El backend debe estar corriendo (`./mvnw spring-boot:run` en `nexora-hotel-backend`).

## Rutas

| Ruta | Quién | Qué |
|---|---|---|
| `/` | Público | Portada de Nexora |
| `/login`, `/plataforma` | SUPER_ADMIN | Alta de hoteles y entrega de accesos al dueño |
| `/h/<slug>` | Público | Portada del hotel: galería, habitaciones, servicios y buscador |
| `/h/<slug>/habitaciones/:id` · `/politicas` | Público | Ficha de habitación y políticas vigentes |
| `/h/<slug>/reservar` | Público | Flujo de reserva con elección de forma de pago |
| `/h/<slug>/mi-reservacion` · `/reservacion/:folio` · `/pago/:ref` | Huésped | Consultar, cancelar y pagar con folio + enlace seguro |
| `/h/<slug>/cuenta/**` | Huésped | Registro con correo verificado, mis reservaciones, pagos, perfil y privacidad |
| `/h/<slug>/login` · `/recuperar` · `/restablecer/:token` | Personal | Acceso |
| `/h/<slug>/panel` | `DASHBOARD:VIEW` | Dashboard: habitaciones, operación del día, dinero (con permiso financiero) |
| `/h/<slug>/panel/reservaciones` · `/clientes` · `/habitaciones` | Según permiso | Operación diaria, calendario, check-in/out, limpieza |
| `/h/<slug>/panel/caja` · `/pagos` | Según permiso | Caja de recepción y pagos |
| `/h/<slug>/panel/reportes` | `REPORTS:*` | 11 reportes con gráficas, tabla y exportación CSV/Excel/PDF |
| `/h/<slug>/panel/tarifas` · `/servicios` · `/configuracion` | Según permiso | Tarifas, impuestos, servicios, tema, políticas, correo y pagos |
| `/h/<slug>/panel/usuarios` · `/roles` · `/auditoria` | Según permiso | Seguridad del hotel |

Cada pantalla se carga al visitarla (`React.lazy`): la portada pública no descarga el panel.

## Estructura

```
src/
  api/          client.js (token en memoria, refresh de vuelo único, X-Hotel, X-Requested-With) + endpoints
  config/       permissions.js (cómo se ven módulos/acciones), navigation.js (menú por permiso)
  context/      Auth (por ámbito), Hotel, Theme (claro/oscuro), Toast
  guards/       RequireAuth, RequirePermission, <Can> para ocultar botones
  layouts/      AuthShell (acceso), StaffLayout (panel)
  components/   ui/ (Input, PasswordInput con medidor, Modal, Badge, Switch, CopyField…), PageHeader,
                charts.jsx (gráficas SVG propias, sin dependencias), reservations, payments, catalog
  pages/        platform/, public/, account/ (huésped), auth/, panel/
  utils/        validators.js (espejo del backend), theme.js (color de marca dinámico), format.js
  tenant.js · router.jsx (Link/Navigate con /h/<slug>)
```

## Seguridad en el cliente

- El access token vive solo en memoria; la sesión se restaura con la cookie httpOnly del refresh token.
- Una sesión por hotel: entrar a otro hotel nunca reutiliza la sesión del anterior.
- Menús, rutas y botones se ocultan según permisos, **pero el backend valida cada operación**.
- Después del login solo se redirige a rutas internas (nunca `//host` ni con `\`).
- Las validaciones replican las del backend (`ValidationPatterns.java`) para mostrar errores bajo cada campo.

## Producción

`Dockerfile` construye y sirve con nginx (fallback SPA). Si el backend está en otro dominio, define
`VITE_API_URL` al construir y en el backend `APP_COOKIE_SECURE=true` y `APP_COOKIE_SAMESITE=None`.

## Idiomas (ES | EN)

El selector **ES | EN** está junto al botón de tema en el panel, el portal y la plataforma. Cambiar de idioma recarga
la página (todo se evalúa ya traducido; la sesión se conserva) y la API responde en el mismo idioma.

- `src/i18n/index.js`: `tx('Texto en español')` y `tx('Hola, {0}', nombre)`. El texto en español es la clave.
- `src/i18n/en.json`: diccionario inglés. Se descarga **solo** si se elige inglés.
- Fechas, números y moneda usan `LOCALE` (`es-MX` / `en-US`).
- `src/test/i18n.test.js` falla si un `tx('…')` no tiene traducción o si una traducción pierde un `{0}`.
