# AI Interviewer Frontend

AI Interview System Frontend built with React + Vite + TypeScript + TailwindCSS.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Frontend will start at http://localhost:3000.

### 3. Build Production Version

```bash
npm run build
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/                 # Page components
│   │   ├── RoleSetup.tsx      # Role setup page
│   │   ├── QuestionBank.tsx   # Question bank management page
│   │   ├── MockConfig.tsx     # Mock interview configuration page
│   │   ├── Interview.tsx      # Interview process page
│   │   └── Report.tsx         # Interview report page
│   ├── components/            # Reusable components
│   │   ├── Navbar.tsx         # Navigation bar
│   │   ├── RoleForm.tsx       # Role input form
│   │   ├── QuestionList.tsx   # Question list component
│   │   ├── RatioSlider.tsx    # Ratio slider component
│   │   └── Followups.tsx      # Follow-up questions display component
│   ├── api.ts                 # API request wrapper
│   ├── store.ts               # Zustand state management
│   ├── types.ts               # TypeScript type definitions
│   ├── App.tsx                # Main application component
│   └── main.tsx               # Application entry point
├── package.json               # Project dependencies
├── tailwind.config.js         # TailwindCSS configuration
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

## 🔧 Technology Stack

- **React 18** - User interface library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling framework
- **Zustand** - State management
- **React Router** - Routing management
- **Recharts** - Chart library
- **Axios** - HTTP client

## 🌐 Backend Integration

### API Base URL

```typescript
const API_BASE_URL = "http://localhost:8080/api";
```

### Main API Endpoints

- `POST /questions/generate` - Generate interview questions
- `POST /session/create` - Create interview session
- `POST /session/{id}/answer` - Submit answer
- `GET /session/{id}/next` - Get next question
- `POST /session/{id}/finish` - End interview
- `POST /session/{id}/report` - Generate report

### CORS Configuration

If you encounter CORS errors, ensure the backend has enabled cross-origin support:

```csharp
// Add in Program.cs
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});
```

## 📱 Features

### 1. Role Setup (RoleSetup)

- Input interview position
- Automatically generate 10 technical questions + 10 background questions

### 2. Question Bank Management (QuestionBank)

- Display technical and background questions in separate columns
- Support deleting individual questions
- Regenerate question bank
- Generate more questions

### 3. Mock Interview Configuration (MockConfig)

- Manual selection mode: User selects questions
- Random selection mode: Randomly select by ratio
- Configurable total questions and ratio

### 4. Interview Process (Interview)

- Display questions one by one
- Input and submit answers
- Display AI-generated follow-up questions
- Support next question and end interview

### 5. Interview Report (Report)

- Radar chart showing skill scores
- Detailed scores and progress bars
- Evidence and improvement suggestions
- Overall evaluation and results

## 🎨 State Management

Using Zustand for global state management:

```typescript
interface InterviewStore {
  role: string; // Interview position
  technical: QuestionDTO[]; // Technical questions
  background: QuestionDTO[]; // Background questions
  sessionId?: string; // Session ID
  selectedQuestions: string[]; // Selected questions
  config: InterviewConfig; // Interview configuration
}
```

## 🔄 Data Flow

1. **Role Input** → Generate question bank → Store in store
2. **Question Bank Management** → Edit/delete/generate more → Update store
3. **Configure Interview** → Select mode/ratio/questions → Create session
4. **Interview Process** → Q&A interaction → Generate follow-ups
5. **Generate Report** → Call backend → Display results

## 🚨 Error Handling

- All API calls have error handling
- Automatically use Mock data as fallback on failure
- Ensure UI won't be blank

## 📦 Development Commands

```bash
# Development mode
npm run dev

# Build
npm run build

# Preview build results
npm run preview

# Code linting
npm run lint
```

## 🌟 Special Features

- **Responsive Design** - Support mobile and desktop
- **Mock Data Fallback** - Complete flow display even when backend is unavailable
- **Smart Question Management** - Support manual selection and random extraction
- **Real-time Progress Tracking** - Interview progress visualization
- **Beautiful Charts** - Use Recharts to display skill radar charts

## 🔮 Future Plans

- [ ] PDF export functionality
- [ ] Interview history records
- [ ] Question favorites functionality
- [ ] Multi-language support
- [ ] Theme switching

## 📞 Technical Support

If you have issues, please check:

1. Is the backend service running on http://localhost:8080
2. Are there CORS errors in network requests
3. Are there error messages in the console
4. Are dependencies correctly installed

## 📄 License

MIT License

## Virtual Interviewer Self-Test

### Prerequisites

1. Backend is started and Azure Speech environment variables are configured
2. Frontend dependencies are installed: `npm install`

### Self-Test Steps

1. **Start Backend**

   ```bash
   cd ../backend/Api
   export AZ_SPEECH_KEY="your-azure-speech-key"
   export AZ_SPEECH_REGION="eastus"
   dotnet run
   ```

2. **Test Speech Token Interface**

   ```bash
   curl "http://localhost:8080/api/speech/token?region=eastus"
   # Should return: {"token": "...", "region": "eastus"}
   ```

3. **Start Frontend**

   ```bash
   cd ../frontend
   npm run dev
   ```

4. **Access Interview Page**

   - Open `http://localhost:5173/interview`
   - Left side should display 3D Avatar (or placeholder)
   - Right side should display interview questions

5. **Test Speech Functionality**

   - Click "Self-Test Sentence" button
   - Should hear TTS playing test sentence
   - Avatar mouth should change with viseme (if model supports)

6. **Debug Mode**
   - Click "Debug ON" button
   - Top right shows current viseme status
   - Console prints morphTargetDictionary key names

### Troubleshooting

- **TTS Failure**: Check backend `/api/speech/token` interface
- **Avatar Not Displaying**: Check `public/avatar.glb` file
- **Mouth Not Moving**: Check if model contains morphTargets
- **CORS Error**: Confirm backend CORS configuration includes frontend port
