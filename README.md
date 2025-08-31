# AI Interview System

A comprehensive AI-powered interview platform built with .NET 8 Web API and React, featuring intelligent question generation, virtual interviewers, and real-time speech recognition.

## 🚀 Features

### Core Interview System

- **Intelligent Question Generation**: Automatically generates interview questions based on job roles and skill ratios
- **Dynamic Follow-up Questions**: AI-powered follow-up questions based on candidate responses (up to 2 per answer)
- **Automated Scoring**: Generates structured interview reports with detailed analysis
- **Multi-dimensional Assessment**: Evaluates technical knowledge, problem-solving, communication, and experience

### Virtual Interviewer Technology

- **D-ID Clips Streams**: High-quality pre-trained virtual human characters
- **Real-time WebRTC**: Low-latency video streaming with live conversation support
- **Premium Avatars**: Multiple virtual interviewer styles and appearances
- **3D Virtual Humans**: Three.js integration for 3D model support

### Speech Interaction System

- **Azure Speech Services**: Speech-to-Text (STT) and Text-to-Speech (TTS) integration
- **Real-time Recognition**: Continuous speech recognition with automatic speech end detection
- **Multi-language Support**: English and other language support
- **Optimized Performance**: Configurable silence timeouts and recognition parameters

### Multi-LLM Support

- **Mock Mode**: Offline development and testing with preset questions
- **Ollama Mode**: Local LLM service supporting open-source models
- **vLLM Mode**: Azure GPU deployment for high-performance inference
- **Unified Interface**: Abstracted LLM client interface for easy switching

## 🏗️ Architecture

### Backend (.NET 8 Web API)

```
ai-interviewer/backend/
├── Api/
│   ├── Controllers/          # API controllers
│   ├── Services/             # Business logic services
│   ├── Models/               # Data models and DTOs
│   ├── Data/                 # Data access layer
│   └── Program.cs            # Application entry point
├── docker/                   # Container configuration
└── Migrations/               # Database migrations
```

### Frontend (React + TypeScript)

```
ai-interviewer/frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Page components
│   ├── store.ts              # State management
│   └── types.ts              # TypeScript type definitions
├── public/                   # Static assets
└── package.json              # Dependencies and scripts
```

## 🛠️ Technology Stack

### Backend

- **Framework**: .NET 8 Web API
- **Database**: PostgreSQL 16 with Entity Framework Core
- **ORM**: Entity Framework Core
- **Containerization**: Docker & Docker Compose
- **LLM Integration**: OpenAI-compatible API (Ollama/vLLM support)

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js
- **State Management**: Zustand
- **HTTP Client**: Axios

### AI & Speech Services

- **Virtual Humans**: D-ID Clips Streams API
- **Speech Recognition**: Azure Cognitive Services
- **Text-to-Speech**: Azure Neural Voices
- **WebRTC**: Real-time video streaming

## 📋 Prerequisites

- **.NET 8 SDK**
- **Node.js 18+** and npm
- **Docker** and Docker Compose
- **D-ID API Key** (for virtual interviewer functionality)
- **Azure Speech Services** (for speech recognition and synthesis)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ai-interviewer
```

### 2. Start Database Services

```bash
cd docker
docker compose up -d
```

**Services Available:**

- PostgreSQL: `localhost:5432` (ai/ai/ai_interview)
- pgAdmin: `http://localhost:5050` (admin@example.com/admin)

### 3. Configure Environment Variables

```bash
cd backend/Api
cp .env.example .env
```

**Required Configuration:**

```bash
# D-ID API Key (required for virtual interviewer)
DID_API_KEY=your-d-id-api-key

# Azure Speech Services (optional, for speech features)
AZ_SPEECH_KEY=your-azure-speech-key
AZ_SPEECH_REGION=eastus

# LLM Provider Configuration
LLM_PROVIDER=mock  # mock, ollama, vllm, or azure
LLM_BASE_URL=http://localhost:11434/v1  # for ollama/vllm
LLM_MODEL=openai-community/gpt-oss-20b
LLM_API_KEY=your-api-key  # for vllm/azure
```

### 4. Start Backend API

```bash
cd backend/Api
dotnet run
```

API will be available at `http://localhost:8080`

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 6. Verify Installation

```bash
# Health check
curl http://localhost:8080/api/health
# Should return: "ok"
```

## 🔧 Configuration Options

### LLM Provider Modes

#### Mock Mode (Development)

```bash
LLM_PROVIDER=mock
```

- Returns preset questions for development and testing
- No external dependencies required

#### Ollama Mode (Local)

```bash
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=openai-community/gpt-oss-20b
```

**Installation:**

```bash
# macOS
brew install ollama
ollama serve
ollama pull openai-community/gpt-oss-20b

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull openai-community/gpt-oss-20b
```

#### vLLM Mode (Azure GPU)

```bash
LLM_PROVIDER=vllm
LLM_BASE_URL=https://your-azure-endpoint.com/v1
LLM_MODEL=gpt-oss-20b
LLM_API_KEY=your-api-key
```

### D-ID Configuration

#### Virtual Interviewer Setup

```bash
# Get API key from https://studio.d-id.com/
DID_API_KEY=your-actual-key

# Optional: Custom avatar configuration
DID_DEFAULT_SOURCE_URL=https://your-custom-avatar.jpg
```

#### Supported Avatar Types

- **Clips Streams**: Premium virtual humans with high-quality appearance
- **Custom Presenters**: Configurable presenter IDs for different styles
- **Voice Options**: Multiple neural voice options (en-US-JennyNeural, etc.)

## 📚 API Reference

### Core Endpoints

#### Question Generation

```bash
POST /api/questions/generate
{
  "role": "React Frontend L4",
  "total": 10,
  "techRatio": 70
}
```

#### Interview Session Management

```bash
# Create session
POST /api/session/create
{
  "questions": [
    {
      "type": "Technical",
      "difficulty": 3,
      "text": "Explain React Hooks",
      "tags": ["React", "Hooks"],
      "expectedPoints": ["useState", "useEffect"]
    }
  ]
}

# Submit answer
POST /api/session/{sessionId}/answer
{
  "orderNo": 1,
  "answerText": "useState for state management, useEffect for side effects"
}

# Get next question
GET /api/session/{sessionId}/next

# Generate report
POST /api/session/{sessionId}/report
```

#### Virtual Interviewer

```bash
# Create stream
POST /api/stream/create
{
  "presenter_id": "v2_Fiona_NoHands_BlackJacket_ClassRoom@1BOeggEufb",
  "driver_id": "dbRUIwY6KY"
}

# Send text to speak
POST /api/stream/{id}
{
  "session_id": "session-id",
  "script": {
    "type": "text",
    "input": "Hello, welcome to the interview!"
  }
}
```

#### Speech Services

```bash
# Get speech token
GET /api/speech/token?region=eastus

# Video session management
POST /api/video-session/create
GET /api/video-session/{id}/next
POST /api/video-session/{id}/answer
POST /api/video-session/{id}/final-report
```

## 🎯 Use Cases

### Enterprise Recruitment

- **Automated Technical Screening**: Reduce manual interview overhead
- **Standardized Assessment**: Consistent evaluation criteria across candidates
- **Scalable Operations**: Handle multiple interviews simultaneously

### Education & Training

- **Interview Preparation**: Practice interviews with AI feedback
- **Skill Assessment**: Evaluate technical and soft skills
- **Remote Learning**: Accessible interview training from anywhere

### Personal Development

- **Self-Assessment**: Practice and improve interview skills
- **Career Preparation**: Prepare for different job roles and industries
- **Confidence Building**: Build interview confidence through practice

## 🔍 Development

### Database Migrations

```bash
cd backend/Api
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Code Quality

```bash
# Frontend linting
cd frontend
npm run lint

# Backend build
cd backend/Api
dotnet build
dotnet test
```

### Environment Variables Reference

| Variable           | Description                          | Example                        | Required |
| ------------------ | ------------------------------------ | ------------------------------ | -------- |
| `DID_API_KEY`      | D-ID API key for virtual interviewer | `your-d-id-api-key`            | ✅ Yes   |
| `AZ_SPEECH_KEY`    | Azure Speech Services key            | `your-azure-key`               | ❌ No    |
| `AZ_SPEECH_REGION` | Azure Speech region                  | `eastus`                       | ❌ No    |
| `LLM_PROVIDER`     | LLM service provider                 | `mock/ollama/vllm/azure`       | ❌ No    |
| `LLM_BASE_URL`     | LLM service endpoint                 | `http://localhost:11434/v1`    | ❌ No    |
| `LLM_MODEL`        | LLM model name                       | `gpt-oss-20b`                  | ❌ No    |
| `LLM_API_KEY`      | LLM API key                          | `your-api-key`                 | ❌ No    |
| `DB_CONN`          | Database connection string           | `Host=localhost;Port=5432;...` | ❌ No    |

## 🐳 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Or build individual services
docker build -t ai-interviewer-backend ./backend
docker build -t ai-interviewer-frontend ./frontend
```

### Production Considerations

- **Environment Variables**: Use proper production environment variables
- **Database**: Use production PostgreSQL instance
- **SSL/TLS**: Configure HTTPS for production
- **Monitoring**: Add application monitoring and logging
- **Scaling**: Consider container orchestration (Kubernetes)

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards

- **Frontend**: Follow React best practices and TypeScript guidelines
- **Backend**: Follow C# coding conventions and .NET best practices
- **Documentation**: Update README and API documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

#### D-ID Connection Problems

- Verify API key is correct
- Check network connectivity to D-ID services
- Ensure proper CORS configuration

#### Speech Recognition Issues

- Verify Azure Speech Services configuration
- Check microphone permissions in browser
- Ensure proper audio device selection

#### LLM Integration Problems

- Verify LLM service is running and accessible
- Check API key and endpoint configuration
- Review network connectivity and firewall settings

### Getting Help

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the API documentation
- **Community**: Join our community discussions

## 🔮 Roadmap

### Upcoming Features

- [ ] Multi-language interview support
- [ ] Advanced analytics and reporting
- [ ] Integration with HR systems
- [ ] Mobile application
- [ ] Advanced AI evaluation algorithms
- [ ] Custom interview templates
- [ ] Team collaboration features

### Performance Improvements

- [ ] WebRTC connection optimization
- [ ] Speech recognition accuracy improvements
- [ ] LLM response time optimization
- [ ] Frontend performance enhancements

---

**Built with ❤️ using modern web technologies and AI services**
