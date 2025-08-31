# Environment Variables Configuration Guide

## Quick Start

### 1. Copy Environment Variables Template

```bash
cp env.example .env
```

### 2. Edit .env File

```bash
# Use your preferred editor
nano .env
# or
code .env
```

### 3. Configure Required Environment Variables

#### Azure Speech Configuration (Required)

```bash
AZ_SPEECH_KEY=your-actual-azure-speech-key
AZ_SPEECH_REGION=eastus
```

#### LLM Configuration (Optional)

```bash
# Use Mock LLM (default)
LLM_PROVIDER=mock

# Or use OpenAI compatible interface
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama2
LLM_API_KEY=your-api-key
```

#### Database Configuration (Optional)

```bash
DB_CONN=Host=localhost;Port=5432;Username=ai;Password=ai;Database=ai_interview
```

#### ASP.NET Core Configuration (Optional)

```bash
ASPNETCORE_URLS=http://localhost:8080
```

## Environment Variables Reference

| Variable Name      | Description                 | Default Value         | Required |
| ------------------ | --------------------------- | --------------------- | -------- |
| `AZ_SPEECH_KEY`    | Azure Speech service key    | -                     | ✅       |
| `AZ_SPEECH_REGION` | Azure Speech service region | eastus                | ❌       |
| `LLM_PROVIDER`     | LLM provider                | mock                  | ❌       |
| `LLM_BASE_URL`     | LLM service address         | -                     | ❌       |
| `LLM_MODEL`        | LLM model name              | -                     | ❌       |
| `LLM_API_KEY`      | LLM API key                 | -                     | ❌       |
| `DB_CONN`          | Database connection string  | Local PostgreSQL      | ❌       |
| `ASPNETCORE_URLS`  | Service listening address   | http://localhost:8080 | ❌       |

## Verify Configuration

After starting the service, the console will display all configuration items:

```bash
dotnet run
```

Expected output:

```
DEBUG: ASPNETCORE_URLS = http://localhost:8080
DEBUG: LLM_PROVIDER = mock
DEBUG: LLM_BASE_URL =
DEBUG: LLM_MODEL =
DEBUG: AZ_SPEECH_REGION = eastus
DEBUG: AZ_SPEECH_KEY = SET
DEBUG: DB_CONN = Host=localhost;Port=5432;Username=ai;Password=ai;Database=ai_interview
```

## Troubleshooting

### 1. Azure Speech Configuration Error

- Ensure `AZ_SPEECH_KEY` is set
- Verify the key is valid
- Check if the region is correct

### 2. Environment Variables Not Loaded

- Ensure `.env` file is in project root directory
- Check file permissions
- Restart the service

### 3. Port Conflict

- Modify `ASPNETCORE_URLS` to use a different port
- Check if the port is occupied

## Security Considerations

- `.env` file has been added to `.gitignore` and will not be committed to version control
- For production environments, please use environment variables or key management services
- Do not hardcode sensitive information in code
