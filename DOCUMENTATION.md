# MeteleskuBlesku Reloaded - Projektova dokumentacia

> **Datum:** 2026-03-29
> **Verzia:** 2.1

---

## Obsah

1. [Prehlad projektu](#1-prehlad-projektu)
2. [Architektura a technologie](#2-architektura-a-technologie)
3. [Struktura projektu](#3-struktura-projektu)
4. [Frontend - Stranky](#4-frontend---stranky)
5. [Backend - API Endpointy](#5-backend---api-endpointy)
6. [Cachovacia strategia](#6-cachovacia-strategia)
7. [AI extrakcia hlasok (Gemini)](#7-ai-extrakcia-hlasok-gemini)
8. [Autentifikacia](#8-autentifikacia)
9. [Datovy model](#9-datovy-model)
10. [Nasadenie a Docker](#10-nasadenie-a-docker)
11. [Konfiguracia prostredia](#11-konfiguracia-prostredia)
12. [Testovanie](#12-testovanie)

---

## 1. Prehlad projektu

**MeteleskuBlesku Reloaded** je modernizovany webovy frontend pre stranku [meteleskublesku.cz](http://meteleskublesku.cz) - cesku medialnu kniznicu zvukovych nahravok z klasickych ceskych a slovenskych filmov. Povodna stranka pouzivala Flash a nebola roky aktualizovana.

### Hlavne funkcie
- Prehliadanie 61 filmov so zvukovymi nahravkami a galeriou obrazkov
- Full-text vyhladavanie podla nazvu filmu aj podla hlasok (audio track names)
- Audio prehravac s playlistom a fixnym bottom barom
- AI-pohaovana extrakcia novych hlasok z YouTube videi (Gemini 3 Flash Preview)
- Autentifikacia (email/heslo + GitHub OAuth)
- Dashboard so spravou ulozenych clipov
- Zdielanie clipov cez unique hash URL
- Responzivny design (mobile + desktop), dark/light mode
- Cinematic UI s oklch farebnou paletou (warm amber/gold)

---

## 2. Architektura a technologie

| Technologia | Verzia | Ucel |
|------------|--------|------|
| **Next.js** | 16.1.6 | App Router framework s Turbopack |
| **React** | 19.1.0 | UI kniznica |
| **TypeScript** | 5.8.3 | Typova bezpecnost |
| **Tailwind CSS** | 4.1.8 | Utility-first styly |
| **Prisma** | 7.5.0 | ORM s SQLite |
| **NextAuth.js** | 5.0.0-beta.30 | Autentifikacia |
| **shadcn/ui** | - | Komponentova kniznica (Radix UI) |
| **react-h5-audio-player** | - | Audio prehravac |
| **youtube-dl-exec** | 3.0.12 | YouTube stahovanie (yt-dlp wrapper) |
| **fluent-ffmpeg** | 2.1.3 | Audio/video spracovanie |
| **sharp** | 0.33.5 | Spracovanie obrazkov |
| **iconv-lite** | - | Konverzia znakovych sad (iso-8859-2) |
| **node-html-parser** | - | HTML parsing (scraping) |
| **Gemini 3 Flash Preview** | - | AI analyza titulkov pre identifikaciu hlasok |
| **next-themes** | - | Dark/light mode |
| **Lucide React** | - | Ikony |
| **Zod** | 3.25.3 | Schema validacia |

### Architektonicky diagram

```
                         Uzivatel
                            |
                 +----------v----------+
                 |   Next.js App       |
                 |   (App Router)      |
                 |                     |
                 |  / (page.tsx)       |  <-- Zoznam filmov + search
                 |  /movie/[id]       |  <-- Detail filmu + audio player
                 |  /add/hlasky       |  <-- AI extrakcia hlasok
                 |  /dashboard        |  <-- Sprava clipov
                 |  /clip/[hash]      |  <-- Zdielanie clipu
                 |  /auth/signin      |  <-- Prihlasenie
                 +----------+----------+
                            |
                 +----------v----------+
                 |   API Routes        |
                 |   (src/app/api/)    |
                 |                     |
                 |  /api/movies        |  <-- Scraping povodnej stranky
                 |  /api/media/image   |  <-- Obrazky (cache-first)
                 |  /api/media/audio   |  <-- Audio (cache-first)
                 |  /api/youtube/*     |  <-- YouTube search/subtitles/analyze/extract
                 |  /api/clips         |  <-- CRUD pre klipy
                 |  /api/auth/*        |  <-- NextAuth.js
                 +-----+-------+------+
                       |       |
            +----------v--+ +--v--------------+
            |  .cache/     | |  meteleskublesku|
            |  (lokalny)   | |  .cz (povodny  |
            |              | |   server)       |
            |  movies.json | +---------+-------+
            |  movie-X.json|           |
            |  images/     |    +------v------+
            |  audio/      |    | Gemini API  |
            +--------------+    | (analyza    |
                                |  titulkov)  |
            +--------------+    +-------------+
            |  SQLite DB   |
            |  (data/)     |    +-------------+
            |  User, Clip  |    | YouTube     |
            |  Draft, etc. |    | (yt-dlp)    |
            +--------------+    +-------------+
```

---

## 3. Struktura projektu

```
meteleskublesku/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # Root layout (providers, header, footer)
│   │   ├── page.tsx                      # Homepage - film grid + search
│   │   ├── globals.css                   # Tailwind 4 + custom styles + oklch theme
│   │   ├── loading.tsx                   # Global loading skeleton
│   │   ├── error.tsx                     # Global error boundary
│   │   ├── not-found.tsx                 # 404 stranka
│   │   ├── movie/
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Detail filmu (gallery + info + audio)
│   │   │       └── loading.tsx           # Loading skeleton pre film
│   │   ├── add/
│   │   │   ├── page.tsx                  # Redirect na /add/hlasky
│   │   │   └── hlasky/
│   │   │       └── page.tsx              # AI extrakcia hlasok (6-step wizard)
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # User dashboard - sprava clipov
│   │   ├── clip/
│   │   │   └── [hash]/
│   │   │       └── page.tsx              # Zdielany clip (public page + SEO)
│   │   ├── auth/
│   │   │   ├── signin/page.tsx           # Prihlasenie (email + GitHub)
│   │   │   ├── signup/page.tsx           # Registracia
│   │   │   └── error/page.tsx            # Auth error stranka
│   │   └── api/
│   │       ├── movies/
│   │       │   ├── route.ts              # GET zoznam filmov
│   │       │   └── [id]/route.ts         # GET detail filmu
│   │       ├── media/
│   │       │   ├── image/route.ts        # GET obrazky (cache-first proxy)
│   │       │   └── audio/route.ts        # GET audio (cache-first proxy)
│   │       ├── youtube/
│   │       │   ├── search/route.ts       # GET YouTube vyhladavanie
│   │       │   ├── subtitles/route.ts    # POST stiahnutie + parsing titulkov
│   │       │   ├── analyze/route.ts      # POST Gemini analyza hlasok
│   │       │   ├── extract/route.ts      # POST extrakcia jedneho segmentu
│   │       │   └── batch-extract/route.ts # POST batch extrakcia viacerych
│   │       ├── clips/route.ts            # GET/POST user clipy
│   │       └── auth/
│   │           ├── [...nextauth]/route.ts # NextAuth.js handler
│   │           └── signup/route.ts        # POST registracia
│   ├── components/
│   │   ├── site-header.tsx               # Hlavicka s navigaciou
│   │   ├── site-footer.tsx               # Paticka s odkazmi
│   │   ├── providers.tsx                 # Theme + Session providers
│   │   ├── theme-toggle.tsx              # Dark/light prepinac
│   │   ├── movie-card.tsx                # Karta filmu (grid item)
│   │   ├── movie-search.tsx              # Search bar + filtered grid
│   │   ├── audio-player.tsx              # Audio playlist + fixed bottom bar
│   │   ├── image-gallery.tsx             # Galeria obrazkov s thumbnailmi
│   │   ├── quote-extraction-flow.tsx     # 6-krokovy wizard pre AI extrakciu
│   │   ├── extraction-wizard.tsx         # Alternativny extraction component
│   │   ├── youtube-player.tsx            # YouTube IFrame API wrapper
│   │   ├── timeline-slider.tsx           # Dual-thumb range slider
│   │   └── ui/                           # shadcn/ui komponenty (16 ks)
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── scroll-area.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── lib/
│   │   ├── auth.ts                       # NextAuth.js konfiguracia
│   │   ├── cache.ts                      # File-system JSON cache s TTL
│   │   ├── gemini.ts                     # Gemini API + VTT parser
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── scraper.ts                    # HTML scraping meteleskublesku.cz
│   │   └── utils.ts                      # Utility funkcie (cn, parseMovieTitle)
│   └── types/
│       ├── movie.ts                      # Movie, MovieListItem, AudioTrack
│       ├── hlasky.ts                     # GeminiQuote, ExtractionJob, FlowStep
│       ├── extraction.ts                 # Extraction types
│       └── youtube.ts                    # YouTube API types
├── prisma/
│   ├── schema.prisma                     # Databazova schema
│   └── prisma.config.ts                  # Prisma konfiguracia
├── data/                                 # SQLite databaza (runtime)
├── .cache/                               # Runtime cache (images, audio, JSON)
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json                       # shadcn/ui konfiguracia
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── deploy.sh
```

---

## 4. Frontend - Stranky

### 4.1 Homepage (`/`)

- Grid kariet filmov (6 stlpcov desktop, 2 mobile)
- Full-text vyhladavanie podla nazvu filmu AJ podla nazvov audio nahravok (hlasok)
- Pri zhode s hlaskou sa pod kartou filmu zobrazi matched track s ikonou Volume2
- Hero sekcia s gradientom a dekorativnymi elementmi
- Badge s poctom filmov (61)
- Server component s `unstable_cache` a tag-based revalidaciou

### 4.2 Detail filmu (`/movie/[id]`)

- 3-stlpcovy layout: galeria | info | audio playlist
- Cinematicky banner s rozmazanym hlavnym obrazkom
- Galeria s hlavnym obrazkom a scrollovatelnym thumbnail stripom
- Metadata: Rezia, Scenar, Namet, Hudba, Hrajú
- Audio playlist s 41 nahravkami a fixnym bottom barom
- URL parameter `?audio=N` pre priamy odkaz na konkretnu nahravku

### 4.3 Extrakcia hlasok (`/add/hlasky`)

6-krokovy wizard:
1. **Najst video** - YouTube search bar
2. **Analyza** - Stiahnutie titulkov + Gemini analyza
3. **Hlasky** - Vyber hlasok s checkboxmi a confidence scores
4. **Kontrola** - Editor segmentov s timeline sliderom a YouTube playerom
5. **Extrakcia** - Batch extraction audio + 3 screenshots per segment
6. **Hotovo** - Ulozenie do databazy

### 4.4 Dashboard (`/dashboard`)

- Statistiky: celkovy pocet clipov, verejne clipy, unikatne filmy
- Grid kariet s thumbnailmi, play a share akciami
- Vyzaduje prihlasenie

### 4.5 Zdielany clip (`/clip/[hash]`)

- Verejna stranka s plnym SEO (OG images, title, description)
- Cinematicky banner, audio prehravac, 3-frame obrazky
- Pristupna bez prihlasenia

### 4.6 Autentifikacia (`/auth/signin`, `/auth/signup`)

- Split layout: filmova hlaska vlavo, formular vpravo (desktop)
- Stacked layout na mobile
- Email/heslo + GitHub OAuth
- Animovane prechodove efekty

---

## 5. Backend - API Endpointy

### 5.1 GET `/api/movies`

Scraping povodnej stranky, vracia zoznam filmov. Cache 7 dni.

### 5.2 GET `/api/movies/[id]`

Detail filmu vcetne audio trackov a galerie. Cache bez expiracie.

### 5.3 GET `/api/media/image?path=...`

Cache-first proxy pre obrazky. Stiahne z povodneho servera pri prvom pristupe.

### 5.4 GET `/api/media/audio?path=...`

Cache-first proxy pre audio. Stiahne z povodneho servera pri prvom pristupe.

### 5.5 GET `/api/youtube/search?q=...`

YouTube vyhladavanie cez `ytsr`.

### 5.6 POST `/api/youtube/subtitles`

Stiahne video cez `yt-dlp`, extrahuje titulky (VTT), parsuje a deduplikuje.

### 5.7 POST `/api/youtube/analyze`

Posle titulky na Gemini 3 Flash Preview API, vrati identifikovane hlasky s timestamps a confidence.

### 5.8 POST `/api/youtube/batch-extract`

Batch extrakcia audio segmentov + 3 screenshotov per segment z cached videa.

### 5.9 GET/POST `/api/clips`

GET - zoznam clipov prihlaseneho uzivatela.
POST - ulozenie noveho clipu s auto-generovanym shareHash.

### 5.10 POST `/api/auth/signup`

Registracia noveho uzivatela s bcrypt hashovanim hesla.

---

## 6. Cachovacia strategia

### File-system cache (`.cache/`)

```
.cache/
├── movies.json              # Zoznam filmov (TTL: 7 dni)
├── movies-with-audio.json   # Filmy s nazvami trackov pre search (TTL: 7 dni)
├── movie-{id}.json          # Detail filmu (bez TTL)
├── {image_path}/            # Stiahnuté obrazky (jpeg)
└── {audio_path}/            # Stiahnuté audio subory (mp3)
```

### Princip fungovania
1. **Cache-first s TTL:** JSON cache ma konfigurovatelnu expiraciu (default 7 dni pre zoznamy)
2. **Lazy loading:** Data sa stahuju a cachuju len pri prvom poziadavke
3. **Enriched cache:** `movies-with-audio.json` obohateny o audio track names pre search (batch fetch 10 filmov paralelne)
4. **JSON helper funkcie:** `readJsonCache(key, ttl)` a `writeJsonCache(key, data)` v `src/lib/cache.ts`

### Next.js Cache Revalidation (unstable_cache + revalidateTag)

Okrem file-system cache pouziva aplikacia aj Next.js `unstable_cache` pre DB queries:

- **Homepage** (`/`): DB queries zabalene v `unstable_cache` s tagmi `["movies", "clips"]`
- **Movie detail** (`/movie/[id]`): Cached queries s tagmi `["movies", "movie-{id}"]` a `["clips", "movie-{id}"]`
- **Dashboard** (`/dashboard`): Zostava `force-dynamic` (per-user data)

Revalidacia sa spusta automaticky pri mutaciach:
- POST/DELETE `/api/clips` → revaliduje `"clips"`, `"movies"`, `"movie-{id}"`
- PATCH `/api/movies/[id]` → revaliduje `"movies"`, `"movie-{id}"`
- Admin import/update endpointy → revaliduju `"movies"` a/alebo `"clips"`

---

## 7. AI extrakcia hlasok (Gemini)

### Proces

1. Uzivatel najde YouTube video s filmom
2. System stiahne video cez `yt-dlp` a extrahuje titulky (VTT format)
3. VTT parser deduplikuje a normalizuje titulkove cues
4. Titulky sa poslu na **Gemini 3 Flash Preview** API so slovensko-jazykovym promptom
5. Gemini vrati az 30 identifikovanych hlasok s:
   - Textom hlasky
   - Casovymi znackami (start/end)
   - Confidence score (0-1)
   - Ktora postava to povedala
6. Uzivatel vyberie hlasky, upravi casove segmenty cez timeline slider
7. System extrahuje audio (MP3) + 3 screenshoty (zaciatok, stred, koniec)
8. Clipy sa ulozia do SQLite databazy s unique shareHash

### Gemini prompt

Prompt instruuje AI aby identifikovalo:
- Vtipne a zapamatatelne hlasky
- Kultove citaty
- Emocionalne momenty
- Hlasky s confidence > 0.7

---

## 8. Autentifikacia

- **NextAuth.js v5** s Prisma adapterom
- **Providers:** Credentials (email/heslo) + GitHub OAuth
- **Hesla:** bcryptjs s auto-salt
- **Session:** JWT strategy
- **Chranene routes:** `/dashboard`, `/api/clips` (POST)

---

## 9. Datovy model

### Prisma schema (SQLite)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          String    @default("user")
  accounts      Account[]
  sessions      Session[]
  clips         UserClip[]
  createdAt     DateTime  @default(now())
}

model UserClip {
  id          String   @id // clip_xxxxx format
  userId      String
  movieId     String?
  videoId     String
  name        String
  filmTitle   String   @default("")
  quoteText   String   @default("")
  audioPath   String
  beginTime   Float
  endTime     Float
  duration    Float
  imageBegin  String?
  imageMiddle String?
  imageEnd    String?
  subtitles   String?
  isPublic    Boolean  @default(false)
  isGlobal    Boolean  @default(false)
  shareHash   String?  @unique
  source      String   @default("manual") // manual | gemini
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(...)
}

model UserMovie {
  id          String   @id // mov_xxxxx format
  userId      String
  videoId     String
  title       String
  year        Int?
  director    String?
  screenplay  String?
  music       String?
  cast        String?
  plot        String?
  thumbnail   String?
  images      String?  // JSON array of {thumbnail, url}
  posterUrl   String?  // CSFD/external poster URL
  csfdId      Int?     // CSFD movie ID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VideoHistory {
  id             String   @id @default(cuid())
  userId         String
  videoId        String
  videoTitle     String
  videoUrl       String
  thumbnail      String   @default("")
  duration       String   @default("")
  author         String   @default("")
  subtitleCues   String?  // JSON array of SubtitleCue (cached)
  quotes         String?  // JSON array of GeminiQuote (cached)
  lastStep       String   @default("subtitles") // subtitles | quotes
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ExtractionDraft {
  id          String   @id @default(cuid())
  userId      String
  videoId     String
  videoTitle  String
  segments    String   // JSON array of ExtractionSegment
  status      String   @default("pending") // pending | running | done | error
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### TypeScript typy

```typescript
// src/types/movie.ts
interface Movie {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audio: AudioTrack[];
  images: MovieImage[];
}

interface MovieListItem {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audioTracks?: string[];  // Pre full-text search
}

interface AudioTrack {
  text: string;
  url: string;
  length: string;
}

// src/types/hlasky.ts
interface GeminiQuote {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  character?: string;
}
```

---

## 10. Nasadenie a Docker

### Docker konfiguracia

**Dockerfile** - Viacstupnovy build:
1. **deps stage:** Node 20 + systemove zavislosti (ffmpeg, yt-dlp, python3)
2. **builder stage:** `npm run build` pre Next.js produkcny build + Prisma generate
3. **runner stage:** Standalone Next.js server s SQLite

**docker-compose.yml:**
```yaml
services:
  meteleskublesku:
    build: .
    ports:
      - "3700:3000"
    volumes:
      - ./data:/app/data      # SQLite perzistencia
      - ./.cache:/app/.cache  # Media cache perzistencia
    environment:
      - DATABASE_URL=file:./data/meteleskublesku.db
```

### Manualne nasadenie

```bash
# Instalacia
npm install

# Prisma setup
npx prisma generate
npx prisma db push

# Development
npm run dev          # http://localhost:3000 (Turbopack)

# Production
npm run build
npm start

# Docker
docker-compose up --build
# Dostupne na http://localhost:3700
```

---

## 11. Konfiguracia prostredia

### Premenne prostredia (.env)

```bash
# Povodna stranka (zdroj dat)
NEXT_PUBLIC_OLD_URL=http://meteleskublesku.cz

# Databaza
DATABASE_URL="file:./data/meteleskublesku.db"

# Auth.js
AUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true

# GitHub OAuth (volitelne)
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Gemini API (pre AI extrakciu)
GEMINI_API_KEY="your-gemini-api-key"

# Google Analytics (volitelne)
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Systemove poziadavky
- **Node.js** 24+ (LTS Krypton)
- **FFmpeg** (pre audio/video extrakciu)
- **yt-dlp** (pre YouTube stahovanie)
- **npm** alebo yarn

---

## 12. Testovanie

### Framework
- **Vitest** s jsdom environmentom
- **@testing-library/react** + **@testing-library/jest-dom** pre komponentove testy
- **@testing-library/user-event** pre simulaciu interakcii

### Struktura testov
```
src/
├── lib/__tests__/           # Unit testy pre core kniznice
│   ├── gemini.test.ts       # VTT parser + Gemini API mock
│   ├── cache.test.ts        # File-system cache logika
│   ├── utils.test.ts        # Utility funkcie
│   └── scraper.test.ts      # HTML scraping s mock fetch
├── app/api/__tests__/       # API route testy
│   ├── movies.test.ts       # GET/PATCH movies
│   ├── clips.test.ts        # GET/POST/DELETE clips
│   ├── signup.test.ts       # Registracia
│   ├── history.test.ts      # History CRUD
│   ├── youtube-subtitles.test.ts
│   └── youtube-analyze.test.ts
└── components/__tests__/    # Komponentove testy
    ├── audio-player.test.tsx
    ├── movie-card.test.tsx
    ├── movie-search.test.tsx
    └── theme-toggle.test.tsx
```

### Spustenie
```bash
npm test              # Jednorazovy beh
npm run test:watch    # Watch mode
npm run test:coverage # S coverage reportom
```

---

## UI Design

### Farebna paleta (oklch)

- **Primary:** Warm amber/gold (`oklch(0.7 0.18 55)` dark / `oklch(0.55 0.18 45)` light)
- **Background:** Near-black dark / warm white light
- **Glass morphism:** `backdrop-blur` s polopriesvitnymi pozadiami
- **Gradienty:** `gradient-hero`, `gradient-text` pre hero sekcie

### Animacie

- `animate-fade-in` - fade + slide up (0.6s)
- `animate-float` - jemne levitovanie (6s infinite)
- `animate-shimmer` - gradient shimmer pre loading stavy

### Responzivita

- **Mobile** (< 640px): 2-stlpcovy grid, icon-only nav, stacked layouts
- **Tablet** (640-1024px): 3-4 stlpcovy grid
- **Desktop** (1024px+): 6 stlpcovy grid, full nav, split layouts
- Container: max-width 1280px, auto centering, 1rem/2rem padding

---

> **Poznamka:** Tato dokumentacia reflektuje stav po kompletnej modernizacii z Pages Router (Next.js 13 + MUI) na App Router (Next.js 16 + Tailwind 4 + shadcn/ui) vykonanej 2026-03-28. Aktualizacia 2026-03-29: pridany test suite (Vitest + Testing Library), Next.js cache revalidation (unstable_cache + revalidateTag), aktualizovany datovy model a opravene verzie zavislosti.
