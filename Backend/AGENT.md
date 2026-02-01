# Backend AGENT.md — Zulip Proxy API

## Amaç
Zulip REST API’ye güvenli bir proxy sağlayan **.NET 8 Minimal API** backend’i.
Kullanıcılar kendi Zulip token’larını girer; backend bunları **şifreli** saklar ve her istekte decrypt eder.

## Repo Konumu
Backend kodu: `backend/`

## Hızlı Başlangıç
1) Proje yoksa oluştur:
```bash
dotnet new webapi -n ZulipMiniUi.Server -o backend/ZulipMiniUi.Server
```
2) Gerekli env/secrets ayarla (aşağıdaki değişkenler).
3) Çalıştır:
```bash
cd backend/ZulipMiniUi.Server
dotnet run
```

## Ortam Değişkenleri (Secrets)
```text
ZULIP_BASE_URL = https://SUBDOMAIN.zulipchat.com

# Uygulama auth
JWT_ISSUER = zulip-mini-ui
JWT_AUDIENCE = zulip-mini-ui
JWT_SIGNING_KEY = <random-64+ chars>

# Kayıt için davet/aktivasyon kodu
APP_INVITE_CODE = <paylaşılacak-kod>

# Token encryption (Data Protection key veya master key)
TOKEN_ENC_KEY = <random-64+ chars>

# DB
DB_CONNECTION = Host=...;Port=5432;Database=zulip_mini_ui;Username=...;Password=...
```

Not: Kullanıcı token’ları frontende **sadece giriş esnasında** girilir. Backend’de şifreli saklanır.
Prod notu:
- `JWT_SIGNING_KEY` ve `TOKEN_ENC_KEY` rotate edilebilir şekilde yönetilmeli (secret manager önerilir).

## Temel Sorumluluklar
- Zulip’e giden tüm isteklerde Basic Auth uygula.
- UI için “temizlenmiş” JSON döndür.
- Basit hata yönetimi yap (Zulip hata mesajını anlamlı dön).
- CORS: client origin’ine izin ver (Vite dev: `http://localhost:5173`).
- Kullanıcı auth: JWT + Identity (veya minimal JWT auth).
- Swagger UI: dev ortamında açık.

## Rate Limiting
- Zulip API rate limit'leri mevcut (200 req/min).
- Backend'de de rate limiting uygulanmalı:
  - Per-user: 100 req/min
  - Global: 1000 req/min
- Paket: `AspNetCoreRateLimit` veya .NET built-in rate limiter.
Uygulama notu:
- Önce global limit + per-user limit ile başla.
- 429 döndür, `Retry-After` ekle.

## Token Yenileme
- Access token: 15 dk expiry
- Refresh token: 7 gün expiry (DB'de sakla)
- Endpoint: `POST /api/auth/refresh`
- Refresh token rotation uygula (her kullanımda yeni token)
Uygulama notu:
- Refresh token DB’de hash’li saklanmalı.
- Eski refresh token kullanılırsa tüm oturumu revoke et.
Uygulama notu (ek):
- Login response içinde `refresh_token` dön.
- Refresh response yeni access + refresh token döner.
Prod öneri:
- Refresh token **HttpOnly cookie** olarak set edilmeli (XSS riskini azaltır).

## Health Checks
- `GET /health` → Liveness (200 OK)
- `GET /health/ready` → Readiness (DB + Zulip bağlantısı)
Uygulama notu:
- Readiness içinde DB bağlantısı + basit Zulip ping (örn. /api/v1/server_settings) kontrol edilir.

## Validation
- FluentValidation kullan
- Tüm DTO'lar için validation rules
- Zulip email formatı, token uzunluğu vb. kontrol et
Uygulama notu:
- Validation hatalarında 400 + alan bazlı hata listesi dön.

## Resilience (Polly)
- Zulip API çağrıları için:
  - Retry: 3 deneme, exponential backoff
  - Circuit Breaker: 5 hata sonrası 30 sn bekle
  - Timeout: 30 sn
Uygulama notu:
- HttpClientFactory üzerinden policy chain kullan.

## Event Polling Service
- `IHostedService` ile arka planda çalışan servis
- Her aktif kullanıcı için Zulip long-poll
- Bağlantı koptuğunda otomatik reconnect
- Graceful shutdown desteği
Uygulama notu:
- Her kullanıcı için queue_id/last_event_id sakla.
- Aktif kullanıcıyı “son 15 dk içinde istek atan” olarak kabul et.

## Auth ve Kullanıcı Yönetimi
Auth yaklaşımı:
- Register/Login akışı backend’de.
- Register sırasında `APP_INVITE_CODE` doğrulanır.
- Kullanıcı kendi **Zulip email + API token** bilgisini girer ve kaydeder.
- Token DB’de **şifreli** tutulur (AES-GCM önerilir).
- Login sonrası JWT verilir.

Örnek auth endpoint’leri:
- `POST /api/auth/register` → invite code + email + password + zulip email + zulip token
- `POST /api/auth/login` → email + password → JWT
- `GET /api/auth/me` → oturum doğrulama
- `POST /api/auth/logout` → optional (stateless ise noop)

## Proxy Endpoint Tasarımı (MVP)
1) Stream listesi  
`GET /api/streams`

2) Topic listesi  
`GET /api/streams/{streamId}/topics`

3) Mesaj listesi  
`GET /api/messages?streamId=1&topic=deploy&anchor=latest&numBefore=50&numAfter=0`

4) Mesaj gönderme  
`POST /api/messages`

## Gerçek Zamanlı Mesaj (Zorunlu)
Eş zamanlı mesaj alabilmek için **WebSocket veya Server-Sent Events** kullan.

Önerilen akış:
1) Client `GET /api/events/register` ile backend’e bağlanır (backend, Zulip `register` API’sini çağırır).  
2) Backend, Zulip’den aldığı `queue_id` + `last_event_id` ile sürekli `GET /api/events` uzun-poll yapar.  
3) Yeni event geldikçe backend, WS/SSE kanalından client’lara push eder.  
4) Client mesaj listesini event ile günceller.  
5) Fallback: WS/SSE koparsa polling ile `GET /api/messages`.

Örnek backend endpointleri:
- `GET /api/events/register` → Zulip register proxy (queue_id + last_event_id)
- `GET /api/events/stream` → SSE stream (opsiyonel)
- `GET /api/events/ws` → WebSocket (opsiyonel)

Notlar:
- Queue bilgisi **kullanıcı başına** saklanmalı (multi-user).
- Uzun-poll Zulip timeouts için retry stratejisi ekle.

## Ek Endpoint’ler (Opsiyonel Gelişmiş)
1) Dosya Yükleme/İndirme  
`POST /api/attachments` — Dosya yükle  
`GET /api/attachments/{id}` — Dosya indir

2) Kullanıcı Listesi  
`GET /api/users` — Org’daki kullanıcılar  
`GET /api/users/{id}` — Kullanıcı detayı

3) Emoji Reactions  
`POST /api/messages/{id}/reactions` — Emoji ekle  
`DELETE /api/messages/{id}/reactions` — Emoji kaldır

4) Mesaj Düzenleme/Silme  
`PATCH /api/messages/{id}` — Mesaj düzenle  
`DELETE /api/messages/{id}` — Mesaj sil

5) Arama  
`GET /api/search?query=keyword` — Mesajlarda ara

6) Presence/Online Status  
`GET /api/users/presence` — Kullanıcıların online durumu

7) Typing Indicators (gerçek zamanlı)  
WebSocket veya Server-Sent Events ile

8) Bildirimler  
`GET /api/notifications` — Okunmamış bildirimler  
`POST /api/notifications/{id}/read` — Bildirimi okundu olarak işaretle

## Uygulama Detayları
**HTTP Client**
- HttpClientFactory kullan.
- BaseAddress: `ZULIP_BASE_URL`
- Default headers: Basic Auth

**Hata Yönetimi**
- Zulip 4xx/5xx dönerse:
  - Status code’u koru
  - Body’deki `msg`/`result` alanlarını UI’a aktar

**Güvenlik**
- JWT doğrulaması tüm `/api/*` endpoint’lerde zorunlu.
- Kullanıcı Zulip token’ları **şifreli** saklanır (AES-GCM).
- Şifreleme anahtarı env ile gelir (`TOKEN_ENC_KEY`).

## Veri Modeli (Öneri)
- `users`
  - `id` (uuid)
  - `email`
  - `password_hash`
  - `created_at`
- `zulip_credentials`
  - `user_id` (fk)
  - `zulip_email`
  - `token_encrypted`
  - `token_iv`
  - `created_at`
- `zulip_queues` (opsiyonel)
  - `user_id` (fk)
  - `queue_id`
  - `last_event_id`
  - `updated_at`

## Çalıştırma (Local)
```bash
cd backend/ZulipMiniUi.Server
dotnet run
```

## Doğrulama Checklist
- `POST /api/auth/register` davet kodu ile çalışıyor.
- `POST /api/auth/login` JWT dönüyor.
- `GET /api/streams` 200 dönüyor.
- `GET /api/streams/{id}/topics` 200 dönüyor.
- `GET /api/messages?...` 200 dönüyor.
- `POST /api/messages` mesajı Zulip’te görünüyor.
- WS/SSE bağlanınca yeni mesajlar anlık geliyor.
