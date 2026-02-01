# Phases — Zulip Mini UI

## Phase 0 — Setup
- Env/secrets hazır (DB, JWT, token encryption)
- Backend ve frontend ayaklanır
- DB migration/seed stratejisi net

## Phase 1 — Auth
- Register + invite code
- Login → access + refresh
- Refresh token rotation
- Settings: Zulip token update
 - Refresh token stratejisi net (HttpOnly cookie önerilir)

## Phase 2 — Core Chat
- Streams list
- Topics list
- Messages list
- Send message

## Phase 3 — Realtime
- SSE/WS bağlantısı
- Yeni mesajları anlık göster
- Reconnect/backoff

## Phase 4 — Polish
- Loading/empty/error states
- Basic UX polish
- Minimal responsive tweaks
