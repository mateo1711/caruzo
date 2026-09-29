# Bio-Seite mit Discord-Login

Node.js-App (Express). Login über Discord OAuth2, Daten werden in `data/users.json` gespeichert, Uploads in `uploads/`.

## Einrichten

1. **Discord Application anlegen:** https://discord.com/developers/applications → *New Application*
2. **OAuth2** → Redirect hinzufügen: `http://localhost:3000/auth/callback` (später deine echte Domain, z. B. `https://samsam.lol/auth/callback`)
3. **Client ID** und **Client Secret** kopieren
4. Im Projektordner:
   ```
   cp .env.example .env     # Werte eintragen
   npm install
   npm start
   ```
5. `http://localhost:3000` öffnen → *Mit Discord einloggen* → Dashboard.
6. In der `.env` `HOME_USER=deinusername` setzen, damit dein Profil direkt auf `/` erscheint.

## Was Discord automatisch liefert
Avatar, Banner, Avatar-Decoration, Nitro-Badge, alle öffentlichen Badges (Staff, HypeSquad, Active Developer, Early Supporter …) und der Server-Tag.
Im Dashboard den Button „Von Discord neu laden“ drücken, wenn du etwas in Discord geändert hast.

## Grenzen (von Discord vorgegeben)
- Booster-Level, Nitro-Laufzeit-Badges und Quest-/Orb-Badges sind über die OAuth-API nicht abrufbar. Das Booster-Badge kann im Dashboard manuell eingeschaltet werden.
- Live-Status läuft über Lanyard (api.lanyard.rest). Dafür einmal dem Lanyard-Server beitreten: discord.gg/lanyard
- Badge-Icons kommen aus dem Discord-CDN. Lädt ein Icon nicht, wird automatisch ein Emoji angezeigt.

## Online stellen
Braucht einen Server mit Node 18+ (VPS, Railway, Render, Fly.io …). `BASE_URL` in der `.env` auf die echte HTTPS-Domain setzen und dieselbe URL + `/auth/callback` im Discord-Portal eintragen. Hinter Nginx/Caddy betreiben.
Hinweis: Sessions liegen im Speicher – nach einem Neustart muss man sich neu einloggen.
