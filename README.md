# Xloom Music (bot de Discord)

El audio de YouTube lo sacan los **celulares de la comunidad** (app Xloom Music → Ajustes → "Prestar mi celular al bot").
Si no hay ningún celular conectado, el bot usa yt-dlp del servidor como respaldo.

## Montarlo en Render
1. Sube esta carpeta a un repo de GitHub → Render → New **Web Service** (Node, `npm install`, `npm start`).
2. Variables de entorno: `DISCORD_TOKEN`, `NODE_KEY` (clave larga inventada por ti), `OWNER_ID`, y opcional `GUILD_ID`.
3. En la app, abre `www/js/xloom-bot-node.js` y pon `BOT_URL` (la URL de Render) y `BOT_KEY` (la misma `NODE_KEY`).
4. En Discord Developer Portal → OAuth2 → invita el bot con scopes `bot` + `applications.commands` y permisos Conectar + Hablar + Enviar mensajes.

## Comandos\nCon prefijo (por defecto `x!`): `x!p canción` · `x!s` · `x!pause` · `x!resume` · `x!q` · `x!ir 3` (pone ya la nº 3 de la cola) · `x!quitar 3` · `x!np` · `x!clear` · `x!stop` · `x!help`. Si repites `x!p`, la canción se agrega a la cola.\n⚠️ Activa **Message Content Intent** en Developer Portal → Bot, o el bot no arranca.\n\nTambién con barra:
/play, /skip, /stop, /pausa, /reanudar, /cola, /celulares, /banear-celular (solo dueño)
