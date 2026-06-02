# Configuracion de Supabase

1. Entra a tu proyecto de Supabase.
2. Abre **SQL Editor**.
3. Copia y ejecuta el contenido de `schema.sql`.
4. Abre `supabaseClient.js`.
5. Pega los valores publicos:

```js
const SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU-ANON-PUBLIC-KEY"
};
```

Usa solo la **anon public key**. No pegues la `service_role`.

Mientras esos valores esten vacios, la app funciona con `localStorage`.

Cuando Supabase este conectado, el indicador superior cambia de `Modo local` a `Supabase conectado`.

## Publicacion en GitHub Pages

Sube estos archivos juntos:

- `index.html`
- `styles.css`
- `app.js`
- `supabaseClient.js`
- `schema.sql`
- `README-configuracion.md`

## Seguridad

Las politicas incluidas son abiertas para facilitar la primera prueba. Cuando se agregue login, conviene ajustar Row Level Security para que solo usuarios autorizados puedan leer o modificar datos.
