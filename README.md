# 🚀 Zulip Custom App

Modern, full-stack Zulip client application with real-time messaging, built with .NET 8 and React.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Zulip Custom App** is a modern, feature-rich client for Zulip that provides:

- 🔐 **Secure Authentication** - JWT-based auth with Zulip token integration
- 💬 **Real-time Messaging** - Live message updates with Server-Sent Events (SSE)
- 🎨 **Modern UI** - Beautiful, responsive interface built with React 19 and Tailwind CSS
- 🚀 **High Performance** - Optimized backend with rate limiting and caching
- 🔒 **Security First** - Built-in security features and best practices
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

---

## ✨ Features

### Core Features

- ✅ **Zulip Integration** - Connect with any Zulip server using API tokens
- ✅ **Stream & Topic Management** - Browse and manage streams and topics
- ✅ **Real-time Messaging** - Send and receive messages instantly
- ✅ **Message Reactions** - React to messages with emojis
- ✅ **File Uploads** - Share images and files
- ✅ **Unread Tracking** - Track unread messages with visual indicators
- ✅ **Quote Replies** - Quote and reply to messages
- ✅ **Emoji Support** - Full emoji support with GitHub shortcodes

### Technical Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 🔄 **SSE Real-time Updates** - Server-Sent Events for live updates
- 🛡️ **Rate Limiting** - Protect against abuse with built-in rate limiting
- 🔒 **CORS Configuration** - Secure cross-origin resource sharing
- 📊 **Swagger Documentation** - Interactive API documentation
- 🐳 **Docker Support** - Containerized deployment ready
- 🔧 **Health Checks** - Monitor application health
- 📝 **Logging** - Comprehensive logging with Serilog

---

## 🛠️ Tech Stack

### Backend (.NET 8)

```
🔹 ASP.NET Core 8.0       - Web framework
🔹 Entity Framework Core  - ORM for PostgreSQL
🔹 Identity Core          - User authentication
🔹 JWT Bearer             - Token authentication
🔹 FluentValidation       - Input validation
🔹 Polly                  - Resilience and retry policies
🔹 Swagger/OpenAPI        - API documentation
🔹 PostgreSQL             - Database
```

### Frontend (React 19)

```
🔹 React 19               - UI library
🔹 TypeScript             - Type safety
🔹 Vite                   - Build tool
🔹 Tailwind CSS           - Styling
🔹 Zustand                - State management
🔹 React Router           - Routing
🔹 Axios                  - HTTP client
🔹 Zod                    - Schema validation
```

### DevOps

```
🔹 Docker                 - Containerization
🔹 GitHub Actions         - CI/CD
🔹 Dependabot             - Dependency updates
🔹 PostgreSQL             - Database
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Auth    │  │ Messages │  │  Streams │              │
│  │  Store   │  │  Store   │  │  Store   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│                   Backend (.NET 8)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   Auth   │  │ Messages │  │  Streams │              │
│  │   API    │  │   API    │  │   API    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                        ↕                                 │
│  ┌──────────────────────────────────────┐              │
│  │        Zulip Client Service          │              │
│  │  (HTTP Client with Polly Retry)      │              │
│  └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP
┌─────────────────────────────────────────────────────────┐
│                   Zulip Server                           │
│              (External Zulip Instance)                   │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL                             │
│         (User Data, Sessions, Cache)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional)

### Quick Start

#### 1. Clone the repository

```bash
git clone https://github.com/suleymanmercan/zulip-custom-app.git
cd zulip-custom-app
```

#### 2. Setup Backend

```bash
cd Backend

# Copy example config
cp appsettings.Example.json appsettings.json

# Update appsettings.json with your values:
# - Database connection string
# - JWT keys
# - Zulip base URL

# Run migrations
dotnet ef database update

# Run backend
dotnet run
```

Backend will start at: `http://localhost:5070`

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://localhost:5070/api" > .env.local

# Run frontend
npm run dev
```

Frontend will start at: `http://localhost:5173`

#### 4. Get Zulip Token

1. Go to your Zulip instance
2. Settings → Account & Privacy → API Key
3. Generate or copy your API key
4. Use it to login in the app

---

## ⚙️ Configuration

### Backend Configuration (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=zulip_app;Username=postgres;Password=your_password"
  },
  "JWT_SIGNING_KEY": "your-super-secret-key-min-32-chars",
  "JWT_ISSUER": "zulip-mini-ui",
  "JWT_AUDIENCE": "zulip-mini-ui",
  "ZULIP_BASE_URL": "https://your-zulip-instance.zulipchat.com",
  "APP_INVITE_CODE": "your-invite-code"
}
```

### Frontend Configuration (`.env.local`)

```bash
VITE_API_BASE_URL=http://localhost:5070/api
```

### Environment Variables

| Variable          | Description                    | Required |
| ----------------- | ------------------------------ | -------- |
| `DB_CONNECTION`   | PostgreSQL connection string   | ✅       |
| `JWT_SIGNING_KEY` | JWT signing key (min 32 chars) | ✅       |
| `JWT_ISSUER`      | JWT issuer                     | ❌       |
| `JWT_AUDIENCE`    | JWT audience                   | ❌       |
| `ZULIP_BASE_URL`  | Zulip server URL               | ✅       |
| `APP_INVITE_CODE` | Invite code for registration   | ✅       |

---

## 📚 API Documentation

### Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "inviteCode": "your-invite-code"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Connect Zulip

```http
POST /api/auth/connect-zulip
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "zulipBaseUrl": "https://your-instance.zulipchat.com",
  "zulipEmail": "your-zulip-email@example.com",
  "zulipApiKey": "your-zulip-api-key"
}
```

### Messages

#### Get Messages

```http
GET /api/messages?streamId=123&topic=general&anchor=newest&numBefore=50&numAfter=0
Authorization: Bearer {jwt_token}
```

#### Send Message

```http
POST /api/messages
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "type": "stream",
  "to": 123,
  "topic": "general",
  "content": "Hello, world!"
}
```

### Streams

#### Get Streams

```http
GET /api/streams
Authorization: Bearer {jwt_token}
```

#### Get Topics

```http
GET /api/streams/{streamId}/topics
Authorization: Bearer {jwt_token}
```

### Real-time Updates

#### Subscribe to Events

```http
GET /api/events/stream
Authorization: Bearer {jwt_token}
Accept: text/event-stream
```

**Full API documentation:** `http://localhost:5070/swagger`

---

## 💻 Development

### Backend Development

```bash
cd Backend

# Run with hot reload
dotnet watch run

# Run tests
dotnet test

# Create migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update
```

### Frontend Development

```bash
cd frontend

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🐳 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Production Checklist

- [ ] Update `appsettings.json` with production values
- [ ] Set strong JWT signing key (min 32 characters)
- [ ] Configure production database
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set up environment variables
- [ ] Enable logging and monitoring
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Review security settings

---

## 🔒 Security

### Best Practices

- ✅ **Never commit secrets** - Use `appsettings.Example.json` as template
- ✅ **Strong passwords** - Enforce strong password policies
- ✅ **JWT expiration** - Tokens expire after 7 days
- ✅ **Rate limiting** - 100 requests per minute per user
- ✅ **CORS** - Configured for specific origins
- ✅ **HTTPS only** - Use HTTPS in production
- ✅ **Input validation** - FluentValidation on all inputs
- ✅ **SQL injection protection** - EF Core parameterized queries

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**@slymanmrcan**

- GitHub: [@suleymanmercan](https://github.com/suleymanmercan)

---

## 🙏 Acknowledgments

- [Zulip](https://zulip.com/) - Open-source team chat
- [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) - Backend framework
- [React](https://react.dev/) - Frontend library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

If you have any questions or need help, please:

- Open an [issue](https://github.com/suleymanmercan/zulip-custom-app/issues)
- Check existing [discussions](https://github.com/suleymanmercan/zulip-custom-app/discussions)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by [@slymanmrcan](https://github.com/suleymanmercan)

</div>
