# Nexora Hotel — Frontend

El contexto completo del proyecto (reglas del usuario, decisiones, estado de las fases, usuarios de prueba, idiomas
y trampas conocidas) está en **`../nexora-hotel-backend/CLAUDE.md`**. Léelo antes de empezar.

Lo propio de este proyecto:
- React 18 + Vite 5 + Tailwind 3. `npx vite --port 5180` (proxy `/api` → backend en :8090). Pruebas: `npx vitest run`.
- Todo texto visible va con `tx('Texto en español')` y su traducción en `src/i18n/en.json`; `src/test/i18n.test.js`
  falla si falta alguna.
- Fechas, números y moneda con `LOCALE` de `src/i18n`, nunca `'es-MX'` fijo.
- Menús desplegables con `ActionMenu` de `components/ui` (portal: no se recortan dentro de tarjetas).
