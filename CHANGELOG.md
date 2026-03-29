# Changelog

Tento changelog je vytvoreny podla formatu [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
a projekt pouziva [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Pridane (Added)

- Vitest test suite (137 testov) — lib, API routes, komponenty
- Next.js cache revalidacia (`unstable_cache` + `revalidateTag`)
- `GEMINI_API_KEY` do `.env.example`

### Zmenene (Changed)

- Homepage: `force-dynamic` nahradeny za `unstable_cache` s tag-based revalidaciou
- Movie detail: cached DB queries s tagmi
- README.md: kompletny prepis podla aktualnej architektury
- `@auth/prisma-adapter` upgradnuty na ^2.11.1

## [2.0.0] - 2026-03-28

### Pridane (Added)

- Next.js 16 App Router s Turbopack
- Tailwind CSS 4 + shadcn/ui (nahrada za MUI)
- Prisma 7.5 + SQLite (nahrada za MongoDB)
- NextAuth v5 (GitHub OAuth + email/heslo)
- AI extrakcia hlasok cez Gemini 3 Flash
- YouTube integracia cez yt-dlp (nahrada za ytdl-core)
- CSFD integracia pre filmove metadata
- 6-krokovy extraction wizard
- User dashboard so spravou klipov
- Zdielanie klipov cez unique hash URL
- Admin nastroje (import legacy dat, update obrazkov/duracii)
- Dark/light mode s oklch farebnou paletou
- Docker deployment
- Kompletny system spravy filmov a klipov

### Odstranene (Removed)

- Pages Router
- Material UI (MUI)
- MongoDB
- ytdl-core

## [1.0.0] - 2024-01-01

### Pridane (Added)

- Next.js Pages Router aplikacia
- Material UI (MUI) pre UI komponenty
- MongoDB databaza
- YouTube integracia cez ytdl-core
- Extrahovanie audia a obrazkov z YouTube
- Cachovanie audia a obrazkov
- Vyhladavanie filmov
- Autoplay funkcionalita
- Zoznam filmov na sledovanie (watch list)
- Docker konfiguracia
- Google Analytics
- Optimalizacia obrazkov cez next/image a sharp
- Filtrovanie filmov
- Footer a navigacia

[Unreleased]: https://github.com/erikmeliska/meteleskublesku/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/erikmeliska/meteleskublesku/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/erikmeliska/meteleskublesku/releases/tag/v1.0.0
