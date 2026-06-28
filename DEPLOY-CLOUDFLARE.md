# OnlyClient auf Cloudflare Pages hosten

Netlify-Guthaben aufgebraucht? Dieses Projekt nutzt **Cloudflare Pages + Functions + KV + R2**.

**Standard-URL:** `https://onlyclient.pages.dev`  
**Update-Feed:** `https://onlyclient.pages.dev/updates/latest.yml`

---

## Wichtig: Kein Drag-and-Drop

**Den Ordner `website/` nicht per Drag-and-Drop ins Cloudflare-Dashboard hochladen.**

Gründe:

1. **25-MiB-Limit pro Datei** — `OnlyClient-Setup.exe` (~85 MB) wird abgelehnt.
2. **`wrangler.toml` vorhanden** — Cloudflare verlangt Deploy über Wrangler CLI (KV- und R2-Bindings).

Stattdessen immer:

```bash
cd C:\Users\noahs\Minecraft-Launcher
npx wrangler login
npm run setup:cloudflare
npm run deploy:website
```

---

## Wie große Dateien funktionieren (R2)

| Was | Wo |
|-----|-----|
| HTML, CSS, Shop, APIs | Cloudflare Pages (statisch + Functions) |
| `latest.yml` (~1 KB) | Pages (statisch unter `/updates/`) |
| `OnlyClient-Setup.exe` (~85 MB) | **R2-Bucket** `onlyclient-releases` |
| Download-Links | `/downloads/OnlyClient-Setup.exe` → Pages Function → R2 |
| Auto-Update | `/updates/OnlyClient-Setup.exe` → Pages Function → R2 |

Die Datei `website/.assetsignore` schließt große `.exe`-Dateien vom Pages-Upload aus. Vor dem Deploy lädt `npm run deploy:website` die Installer automatisch nach R2 hoch.

`latest.yml` bleibt mit relativen Pfaden (`OnlyClient-Setup.exe`) — electron-updater lädt über dieselbe Domain, die Function liefert aus R2.

---

## Einmalige Einrichtung

### 1. Cloudflare-Konto

1. Kostenloses Konto auf [dash.cloudflare.com](https://dash.cloudflare.com) anlegen.
2. Im Projektordner einloggen:

```bash
cd C:\Users\noahs\Minecraft-Launcher
npx wrangler login
```

### 2. R2 aktivieren + KV/R2 anlegen

1. [Dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2/overview) → **Enable R2** (Free Tier reicht; Fehler `10042` = R2 noch nicht aktiviert).
2. Dann:

```bash
npm run setup:cloudflare
```

Das erstellt:

- KV-Namespace `ONLYCLIENT_DATA` → ID in `website/.kv-id`
- R2-Bucket `onlyclient-releases` für Installer
- Patched `website/wrangler.toml` (KV + R2 Bindings)

### 3. Pages-Projekt erstellen

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages**.
2. Projektname: **`onlyclient`** (oder anderen Namen — dann `CLOUDFLARE_PAGES_PROJECT=dein-name` setzen).
3. **Nicht** „Upload assets“ für den Website-Ordner nutzen — Deploy läuft über die CLI.

### 4. Admin-Geheimnis (Only+ Shop)

```bash
npx wrangler pages secret put PLUS_ADMIN_SECRET --project-name=onlyclient
```

Dort den gleichen Wert eingeben wie früher bei Netlify (`PLUS_ADMIN_SECRET`).

### 5. Bindings prüfen

Nach dem ersten Deploy unter **onlyclient** → **Settings** → **Functions**:

| Binding | Typ | Name |
|---------|-----|------|
| `DATA` | KV | ONLYCLIENT_DATA |
| `RELEASES` | R2 | onlyclient-releases |

Werden automatisch aus `website/wrangler.toml` gesetzt, wenn du `npm run deploy:website` nutzt.

---

## Deploy (Website + Updates + APIs)

Vollständiger Release (Build + R2 + Pages):

```bash
npm run deploy
```

Nur Website ohne neuen Electron-Build (Installer muss schon in `website/` liegen):

```bash
npm run deploy:website
```

Nur Installer nach R2 hochladen (ohne Pages-Deploy):

```bash
npm run deploy:r2
```

Ablauf bei `deploy:website`:

1. `prepare-website.js` kopiert Build-Artefakte nach `website/`
2. `upload-r2-releases.js` lädt `.exe` + `.blockmap` nach R2
3. `prepare-pages-deploy.js` erstellt Staging ohne Dateien >25 MiB
4. `wrangler pages deploy` aus `.pages-deploy/`

---

## 522-Fehler beheben

Ein **522** auf `onlyclient.pages.dev` bedeutet: **kein erfolgreiches Pages-Deployment** (Projekt leer oder letzter Deploy fehlgeschlagen).

| Ursache | Lösung |
|---------|--------|
| 0 Deployments im Dashboard | `npm run deploy:website` |
| Deploy bricht bei 25 MiB ab | Nicht Drag-and-Drop — CLI nutzt R2 + Staging |
| R2-Fehler `10042` | R2 im Dashboard aktivieren → `npm run setup:cloudflare` |
| `R2 bucket 'onlyclient-releases' not found` | R2 nicht aktiviert oder Bucket fehlt — Upload landete ggf. nur lokal in `website/.wrangler/`. Dashboard → R2 aktivieren → `npm run setup:cloudflare` → erneut deployen |
| Website ohne Installer (Fallback) | `SKIP_R2=1 npm run deploy:website` — nur statische Seite, keine Downloads |
| Wrangler nicht eingeloggt | `npx wrangler login` |
| Eigene Domain / DNS falsch | CNAME auf `onlyclient.pages.dev` |

**Sofort-Fix:**

```bash
cd C:\Users\noahs\Minecraft-Launcher
npx wrangler login
npm run setup:cloudflare
npm run build:website
npm run deploy:website
```

Danach prüfen:

- `https://onlyclient.pages.dev` lädt Shop und Startseite
- `https://onlyclient.pages.dev/updates/latest.yml` liefert Version
- `https://onlyclient.pages.dev/downloads/OnlyClient-Setup.exe` startet Download (aus R2)

---

## Eigene Domain (optional)

1. Cloudflare Pages → **onlyclient** → **Custom domains** → Domain hinzufügen.
2. Umgebungsvariable setzen (PowerShell):

```powershell
$env:ONLYCLIENT_SITE_URL = "https://deine-domain.de"
npm run deploy:website
```

3. In `package.json` unter `build.publish.url` die Update-URL anpassen und neu bauen.

---

## Umgebungsvariablen

| Variable | Wo | Zweck |
|----------|-----|-------|
| `PLUS_ADMIN_SECRET` | Cloudflare Pages Secret | Gold Only+ im Shop vergeben |
| `ONLYCLIENT_SITE_URL` | Lokal beim Deploy | Eigene Domain statt `onlyclient.pages.dev` |
| `CLOUDFLARE_PAGES_PROJECT` | Lokal beim Deploy | Anderer Pages-Projektname |
| `CLOUDFLARE_R2_BUCKET` | Lokal beim Deploy | Anderer R2-Bucket-Name |
| `ONLYPLUS_CLOUD_URL` | Launcher (optional) | Override für Plus-API-URL |

---

## APIs

| Funktion | URL |
|----------|-----|
| Only+ | `/api/plus-api` |
| Nametags | `/api/nametags-api` |
| Galerie | `/api/gallery-api` |
| Voice | `/api/voice-api` |
| Capes | `/api/capes-api` |
| Freunde-Chat | `/api/friends-chat-api` |

Alte Netlify-Pfade (`/.netlify/functions/...`) werden per `_redirects` weitergeleitet.

---

## Daten von Netlify migrieren

KV startet leer. Only+-Mitglieder, Nametags, Galerie usw. müssen neu angelegt oder manuell exportiert werden. Permanente Plus-Mitglieder in `plus-api.js` (`PERMANENT_PLUS`) werden beim ersten API-Aufruf automatisch angelegt.

---

## Netlify-Migrations-Brücke (einmalig)

**Problem:** Nutzer mit alter OnlyClient-Installation (z. B. **2.7.20**) prüfen Updates noch über `onlyclient.netlify.app`. Netlify-Guthaben ist aufgebraucht — ohne Brücke müssten alle manuell neu installieren.

**Lösung:** Nur **eine kleine Datei** (`latest.yml`, ~1 KB) auf Netlify hochladen. Sie zeigt Version **2.7.33+** an und verweist den Download auf die **volle Cloudflare-URL** — die `.exe` liegt **nicht** auf Netlify (kostenlos, kein 25-MiB-Limit).

### Ablauf für Admins

1. **Release bauen und auf Cloudflare deployen** (Installer muss auf pages.dev/R2 liegen):

```bash
cd C:\Users\noahs\Minecraft-Launcher
npm run release
npm run deploy
```

2. **Brücken-Datei** liegt danach hier:

```
website/updates/netlify-bridge/latest.yml
```

Darin stehen absolute URLs wie `https://onlyclient.pages.dev/updates/OnlyClient-Setup.exe` (wird bei jedem `npm run release` neu erzeugt).

3. **Nur diese eine Datei auf Netlify** unter `/updates/latest.yml` legen — **ohne** `.exe`:

**Option A — Netlify CLI (empfohlen):**

```bash
cd C:\Users\noahs\Minecraft-Launcher
mkdir -p website/updates/.netlify-bridge-deploy/updates
copy website\updates\netlify-bridge\latest.yml website\updates\.netlify-bridge-deploy\updates\latest.yml
npx netlify deploy --prod --dir=website/updates/.netlify-bridge-deploy
```

**Option B — Netlify Dashboard:**

1. [app.netlify.com](https://app.netlify.com) → Site **onlyclient** → **Deploys**
2. **Deploy manually** oder per Drag-and-Drop nur den Ordner mit `updates/latest.yml`
3. Zielpfad auf der Site: `https://onlyclient.netlify.app/updates/latest.yml`

4. **Prüfen:**

```bash
curl -s https://onlyclient.netlify.app/updates/latest.yml
```

Erwartung: `version: 2.7.33` (oder höher) und `url: https://onlyclient.pages.dev/updates/OnlyClient-Setup.exe`

### Was Nutzer erleben

| Installation | Verhalten |
|--------------|-----------|
| **2.7.20** (Netlify-Feed) | Start → Update erkannt → Download von **pages.dev** → nach Install: künftig nur noch Cloudflare |
| **2.7.33+** (Cloudflare-Feed) | Normaler Auto-Update von pages.dev; Fallback auf Netlify falls pages.dev down |
| **Portable** | Kein Auto-Update — einmal Setup von onlyclient.pages.dev installieren |

### Wichtig

- Brücke **einmalig** reicht — nach dem Update auf 2.7.33+ zeigt `app-update.yml` auf `onlyclient.pages.dev`.
- Netlify muss **kein** Guthaben für große Dateien verbrauchen (nur ~1 KB YAML).
- `website/updates/netlify-bridge/` wird **nicht** nach Cloudflare deployed — nur lokal als Vorlage für den Netlify-Upload.

---

## Netlify als Fallback

```bash
npm run deploy:netlify
```

Netlify-Code liegt weiterhin unter `website/netlify/` und `website/netlify.toml`. Für die Migration reicht meist die **Brücken-YAML** oben — kein vollständiger Netlify-Deploy nötig.

---

## Lokale Entwicklung

```bash
cd website
npx wrangler pages dev . --kv DATA=<deine-kv-id>
```

Secret lokal: `.dev.vars` mit `PLUS_ADMIN_SECRET=...` anlegen (nicht committen).
