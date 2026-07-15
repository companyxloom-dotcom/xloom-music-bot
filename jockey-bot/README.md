# 🎶 Jockey Bot — bot de música para Discord

Bot de música tipo Jockie Music: YouTube, Spotify, SoundCloud, cola automática.

## 1. Crear el bot en Discord

1. Ve a https://discord.com/developers/applications
2. **New Application** → ponle nombre (ej. "Jockey Bot") → Create.
3. En el menú izquierdo, **Bot** → **Add Bot**.
4. Activa estos toggles en la misma página de Bot:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (opcional, no molesta)
5. Copia el **Token** (botón "Reset Token" si no lo ves) → lo vas a pegar en `.env`.
6. En **OAuth2 → General**, copia el **Client ID** → también va en `.env`.

## 2. Invitar el bot a tu servidor de Minecraft/Discord

1. Ve a **OAuth2 → URL Generator**.
2. Marca los scopes: `bot` y `applications.commands`.
3. En permisos marca: `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`.
4. Copia el link que se genera abajo, ábrelo en el navegador y selecciona tu servidor.

## 3. Configurar el proyecto

1. Instala Node.js 18+ si no lo tienes: https://nodejs.org
2. Descomprime este ZIP y abre una terminal ahí adentro.
3. Copia `.env.example` a `.env` y rellena:
   ```
   DISCORD_TOKEN=el_token_que_copiaste
   CLIENT_ID=el_client_id_que_copiaste
   GUILD_ID=el_id_de_tu_servidor   (clic derecho al servidor con Modo Desarrollador activo → Copiar ID)
   ```
   `GUILD_ID` es opcional pero recomendado: hace que los comandos `/` aparezcan al instante en vez de esperar 1 hora.

4. Instala dependencias:
   ```
   npm install
   ```

5. Registra los comandos slash (solo hay que hacerlo cuando agregues/cambies comandos):
   ```
   npm run deploy
   ```

6. Corre el bot:
   ```
   npm start
   ```

Si todo salió bien verás `✅ Conectado como Jockey Bot#XXXX` en la consola.

## 4. Usarlo

Entra a un canal de voz y en el chat escribe:
- `/xreproducir cancion:nombre o link` — reproduce/agrega a la cola
- `/xpausar` / `/xreanudar`
- `/xsaltar`
- `/xdetener`
- `/xcola`
- `/xsonando`
- `/xvolumen nivel:50`
- `/xsalir`

## 5. Ponerlo 24/7 GRATIS (sin tarjeta, sin PC prendida)

Vamos a usar **Render** (hosting gratis) + **UptimeRobot** (le hace ping cada 5 min para que Render no lo duerma). Ninguno de los dos pide tarjeta.

### 5.1 Subir el código a GitHub

1. Crea cuenta gratis en https://github.com si no tienes.
2. Crea un repositorio nuevo (puede ser privado).
3. Sube ahí la carpeta del bot (arrastra los archivos en la web de GitHub, o con git si sabes usarlo). **No subas el archivo `.env`** (ya está en `.gitignore`, tus claves quedan seguras).

### 5.2 Desplegar en Render

1. Crea cuenta gratis en https://render.com (puedes entrar con tu cuenta de GitHub).
2. **New +** → **Web Service**.
3. Conecta tu repositorio de GitHub del bot.
4. Configuración:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. En **Environment Variables** agrega las mismas del `.env`: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.
6. Dale **Create Web Service**. Va a instalar y prender el bot solo. Cuando el log diga `✅ Conectado como Xloom Music#XXXX`, ya está corriendo en la nube.
7. Copia la URL que te da Render arriba (algo como `https://xloom-music.onrender.com`).

### 5.3 Mantenerlo despierto con UptimeRobot

1. Crea cuenta gratis en https://uptimerobot.com (sin tarjeta).
2. **Add New Monitor**:
   - Monitor Type: **HTTP(s)**
   - URL: `https://tu-url-de-render.onrender.com/healthz`
   - Monitoring Interval: **5 minutos**
3. Guarda. Listo — UptimeRobot le va a estar pegando cada 5 min y Render nunca lo va a dormir.

Con esto el bot queda prendido 24/7 sin gastar un peso y sin necesitar tu PC ni tu celular encendidos. Solo toca correr `npm run deploy` una vez desde tu PC (o desde Render con un "Shell" si prefieres) cada vez que agregues o cambies comandos slash.



- Necesitas **ffmpeg**, pero ya viene incluido vía el paquete `ffmpeg-static`, no hay que instalar nada aparte.
- Si en algún momento YouTube empieza a bloquear la extracción de audio (pasa de vez en cuando), me avisas y le metemos el plugin `@distube/yt-dlp` como respaldo — es un poco más pesado de instalar porque necesita el binario de yt-dlp.
- Para dejarlo prendido 24/7 sin tener tu PC encendida, cuando quieras lo subimos a un VPS barato (Railway, Render, un VPS de Contabo/Hetzner) — el código no cambia, solo dónde corre.
