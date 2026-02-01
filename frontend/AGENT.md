# Frontend AGENT.md — Zulip Mini UI

## Amaç
Zulip mesajlaşma platformu için modern, hafif ve kullanıcı dostu bir **React + TypeScript** web arayüzü.
Backend proxy API üzerinden Zulip'e bağlanır, gerçek zamanlı mesajlaşma destekler.

## Repo Konumu
Frontend kodu: `frontend/`

## Tech Stack
| Teknoloji | Versiyon | Amaç |
| --- | --- | --- |
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| React Router | 6.x | Routing |
| Zustand | 4.x | State management |
| TanStack Query | 5.x | Server state & caching |
| Tailwind CSS | 3.x | Styling |
| Axios | 1.x | HTTP client |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Validation |

## Hızlı Başlangıç
1) Proje oluştur:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```
2) Bağımlılıkları yükle:
```bash
npm install react-router-dom zustand @tanstack/react-query axios
npm install react-hook-form zod @hookform/resolvers
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
3) Environment ayarla (.env.local):
```bash
cp .env.example .env.local
```
4) Çalıştır:
```bash
npm run dev
```

## Ortam Değişkenleri
```text
# .env.example
VITE_API_BASE_URL=http://localhost:5070/api
VITE_WS_URL=ws://localhost:5070/api/events/ws
VITE_APP_NAME=Zulip Mini UI
```
Not: `VITE_` prefix'i zorunlu (Vite convention).

## Klasör Yapısı
```text
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/                    # API client & endpoints
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Auth API calls
│   │   ├── streams.ts          # Stream API calls
│   │   ├── messages.ts         # Message API calls
│   │   └── types.ts            # API response types
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Primitive components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Avatar.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   └── chat/               # Chat-specific components
│   │       ├── StreamList.tsx
│   │       ├── TopicList.tsx
│   │       ├── MessageList.tsx
│   │       ├── MessageItem.tsx
│   │       ├── MessageInput.tsx
│   │       └── TypingIndicator.tsx
│   │
│   ├── features/               # Feature modules
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── useAuth.ts
│   │   └── chat/
│   │       ├── ChatView.tsx
│   │       └── useMessages.ts
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useWebSocket.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── uiStore.ts
│   │
│   ├── pages/                  # Route pages
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── routes/                 # Routing config
│   │   ├── index.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatDate.ts
│   │   ├── parseMarkdown.ts
│   │   └── storage.ts
│   │
│   ├── types/                  # Global types
│   │   ├── auth.ts
│   │   ├── stream.ts
│   │   ├── message.ts
│   │   └── user.ts
│   │
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── .env.local                  # Git ignored
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Temel Sorumluluklar
- Kullanıcı authentication (login/register/logout)
- Stream ve topic listesi görüntüleme
- Mesaj listesi görüntüleme (sayfalama ile)
- Mesaj gönderme
- Gerçek zamanlı mesaj alma (WebSocket/SSE)
- Responsive tasarım (mobile-first)
- Offline durumu handle etme

## Routing Yapısı
```tsx
// src/routes/index.tsx
const routes = [
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  // Protected routes
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/chat" /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:streamId', element: <ChatPage /> },
      { path: 'chat/:streamId/:topic', element: <ChatPage /> },
    ]
  },
  // 404
  { path: '*', element: <NotFoundPage /> }
];
```

## State Management
Auth Store (Zustand)
```ts
// src/stores/authStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}
```

Chat Store (Zustand)
```ts
// src/stores/chatStore.ts
interface ChatState {
  streams: Stream[];
  currentStream: Stream | null;
  currentTopic: string | null;
  messages: Message[];
  isLoadingStreams: boolean;
  isLoadingMessages: boolean;
  setCurrentStream: (stream: Stream) => void;
  setCurrentTopic: (topic: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: number, updates: Partial<Message>) => void;
  prependMessages: (messages: Message[]) => void;
}
```

## API Client
Axios Instance
```ts
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await useAuthStore.getState().refreshToken();
        return apiClient.request(error.config);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## Token Yönetimi
### Storage Stratejisi
- **Access Token**: Memory (Zustand store) — XSS'e karşı daha güvenli
- **Refresh Token**: **HttpOnly cookie (backend set eder)** — prod öneri
Not: MVP’de localStorage kullanılabilir ama prod’da önerilmez.

### Token Refresh Akışı
1. API 401 döner
2. Interceptor refresh endpoint'i çağırır
3. Yeni token pair alınır
4. Orijinal istek tekrar edilir
5. Refresh başarısızsa → logout

### Uygulama Notu
- Token'ı localStorage'a yazma (XSS riski)
- Refresh token HttpOnly cookie tercih edilir
- Memory'de tutuluyorsa, sayfa yenilemede `/api/auth/me` ile session kontrol et

## Gerçek Zamanlı Mesaj (SSE primary)
- Backend SSE üzerinden yayın yapar.
- EventSource header gönderemediği için SSE bağlantısı `fetch` + stream reader ile yapılır.
- WS opsiyonel; yoksa polling fallback yapılır.

WebSocket Hook (opsiyonel)
```ts
// src/hooks/useWebSocket.ts
interface UseWebSocketOptions {
  onMessage: (event: ZulipEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}
```

## Event Handling
```ts
type ZulipEvent =
  | { type: 'message'; message: Message }
  | { type: 'update_message'; message_id: number; content: string }
  | { type: 'delete_message'; message_id: number }
  | { type: 'typing'; sender: User; op: 'start' | 'stop' }
  | { type: 'presence'; user_id: number; status: 'active' | 'idle' | 'offline' };
```

## UI Bileşenleri
Message List / Item / Input bileşenleri; infinite scroll, emoji, dosya ekleme, typing indicator destekler.

## Form Handling (React Hook Form + Zod)
Login & Register formları Zod ile doğrulanır.

## Error Handling
API hataları normalize edilir, UI toast ile bildirilir.

## Responsive Design
- Mobile-first
- Sidebar: mobile drawer, desktop fixed
- Breakpoints: sm 640, md 768, lg 1024, xl 1280

## Testing
- Unit: Vitest + Testing Library
- E2E: Playwright veya Cypress (opsiyonel)

## Build & Deployment
```bash
npm run build
npm run preview
```

## Çalıştırma (Local)
```bash
cd frontend
npm install
npm run dev
```

## Doğrulama Checklist
Auth
- Login / Register çalışıyor
- Token refresh çalışıyor
- Protected route unauthorized redirect ediyor

Chat UI
- Stream listesi yükleniyor
- Topic listesi yükleniyor
- Mesajlar yükleniyor
- Mesaj gönderme çalışıyor

Real-time
- WebSocket/SSE bağlantısı kuruluyor
- Yeni mesajlar anlık görünüyor
