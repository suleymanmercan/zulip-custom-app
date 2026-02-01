# AGENT.md — Zulip UI (Genel Mimari)

## Amaç
Mevcut Zulip org’una (örn: `https://SUBDOMAIN.zulipchat.com`) bağlanan, resmi Zulip arayüzüne girmeden kullanılacak **sade bir web UI** geliştirmek.
Kullanıcılar kendi Zulip token’larını girerek **kendi adlarına** mesaj atar/okur.

## Mimari
Tarayıcıdan Zulip API’ye doğrudan istek CORS ve güvenlik nedeniyle sorun çıkarır.  
Mimari: **React UI → .NET Proxy API → Zulip REST API**

Auth akışı:
- Kullanıcı önce uygulamaya register/login olur.
- Kayıt sırasında “davet/aktivasyon kodu” doğrulanır.
- Kullanıcı kendi **Zulip email + API token** bilgisini girer.
- Backend token’ı **şifreli** saklar; her istek için decrypt edip Zulip’e kullanır.
- Frontend, backend’e JWT ile erişir.

## Teknoloji Seçimi
- Backend: **.NET 8 Minimal API** (ASP.NET Core Web API)
- Frontend: **React + Vite + TypeScript**
- İletişim: Frontend yalnızca kendi backend’ine konuşur
- Auth: **JWT** (Microsoft Identity / ASP.NET Core Identity)
- DB: **PostgreSQL**

## Repo Yapısı
- `backend/` → .NET Minimal API proxy
- `frontend/` → React UI

## Detaylı Dokümanlar
- Backend detayları: `backend/AGENT.md`
- Frontend detayları: `frontend/AGENT.md`
