using AiInterviewer.Api.Services;
using AiInterviewer.Api.Data;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Net.Mime;
using System.Collections.Concurrent;

// ✅ Correct order
// 1. First load environment variables
Env.Load();

// 2. Then read environment variables
var aspNetCoreUrls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://localhost:8080";

// 3. Explicitly set ASPNETCORE_URLS environment variable
Environment.SetEnvironmentVariable("ASPNETCORE_URLS", aspNetCoreUrls);

// 4. Finally create WebApplication
var builder = WebApplication.CreateBuilder(args);

// Session ID is managed directly by frontend, no server-side storage needed

// Read configuration from environment variables
var dbConnection = Environment.GetEnvironmentVariable("DB_CONN")
    ?? "Host=localhost;Port=5432;Username=ai;Password=ai_interview";
var llmProvider = Environment.GetEnvironmentVariable("LLM_PROVIDER") ?? "mock";
var azSpeechKey = Environment.GetEnvironmentVariable("AZ_SPEECH_KEY");
var azSpeechRegion = Environment.GetEnvironmentVariable("AZ_SPEECH_REGION") ?? "eastus";

// D-ID Configuration
var didApiKey = Environment.GetEnvironmentVariable("DID_API_KEY") ?? builder.Configuration["DID_API_KEY"];
var didBase = Environment.GetEnvironmentVariable("DID_API_BASE") ?? builder.Configuration["DID_API_BASE"] ?? "https://api.d-id.com";
var clientOrigin = Environment.GetEnvironmentVariable("CLIENT_ORIGIN") ?? builder.Configuration["CLIENT_ORIGIN"] ?? "http://localhost:5173";

// Debug logging
Console.WriteLine("=== ENVIRONMENT VARIABLES DEBUG ===");
Console.WriteLine($"DEBUG: ASPNETCORE_ENVIRONMENT = {Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}");
Console.WriteLine($"DEBUG: ASPNETCORE_URLS = {aspNetCoreUrls}");
Console.WriteLine($"DEBUG: LLM_PROVIDER = {llmProvider}");
Console.WriteLine($"DEBUG: LLM_BASE_URL = {Environment.GetEnvironmentVariable("LLM_BASE_URL")}");
Console.WriteLine($"DEBUG: LLM_MODEL = {Environment.GetEnvironmentVariable("LLM_MODEL")}");
Console.WriteLine($"DEBUG: AZ_SPEECH_REGION = {azSpeechRegion}");
Console.WriteLine($"DEBUG: AZ_SPEECH_KEY = {(string.IsNullOrEmpty(azSpeechKey) ? "NOT SET" : "SET")}");
Console.WriteLine($"DEBUG: DID_API_KEY = {(string.IsNullOrEmpty(didApiKey) ? "NOT SET" : "SET")}");
Console.WriteLine($"DEBUG: DID_API_BASE = {didBase}");
Console.WriteLine($"DEBUG: CLIENT_ORIGIN = {clientOrigin}");
Console.WriteLine($"DEBUG: DB_CONN = {dbConnection}");
Console.WriteLine("=== END DEBUG ===");

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add D-ID HTTP Client
if (!string.IsNullOrEmpty(didApiKey))
{
  builder.Services.AddHttpClient("did", c =>
  {
    c.BaseAddress = new Uri(didBase);
    var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes(didApiKey + ":"));
    c.DefaultRequestHeaders.Authorization =
          new AuthenticationHeaderValue("Basic",
              Convert.ToBase64String(Encoding.UTF8.GetBytes($"{didApiKey}:")));
    c.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    c.Timeout = TimeSpan.FromSeconds(30);
  })
  // **Critical fix: Add this part to disable Cookie handling**
  .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
  {
    // Disabling cookies prevents HttpClient from incorrectly handling Set-Cookie headers
    // from D-ID load balancers, thus solving the session_id pollution issue.
    UseCookies = false
  });

  Console.WriteLine("DEBUG: D-ID HTTP Client registered with cookie handling disabled");
}
else
{
  Console.WriteLine("DEBUG: D-ID API Key not set, D-ID client not registered");
}

// Add CORS
builder.Services.AddCors(options =>
{
  options.AddPolicy("AllowFrontend", policy =>
  {
    policy.WithOrigins(clientOrigin, "http://localhost:3000", "http://localhost:4173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
  });
});

// Database
if (builder.Environment.IsDevelopment())
{
  // Development environment forces use of in-memory database to avoid PostgreSQL connection issues
  builder.Services.AddDbContext<AppDbContext>(options =>
      options.UseInMemoryDatabase("ai_interview_dev"));
  Console.WriteLine("DEBUG: Using In-Memory Database for development");
}
else
{
  // Production environment uses PostgreSQL
  builder.Services.AddDbContext<AppDbContext>(options =>
      options.UseNpgsql(dbConnection));
  Console.WriteLine("DEBUG: Using PostgreSQL Database");
}

// LLM Client Registration
switch (llmProvider.ToLower())
{
  case "mock":
    Console.WriteLine("DEBUG: Registering LLMClientMock");
    builder.Services.AddSingleton<ILLMClient, LLMClientMock>();
    break;
  case "ollama":
  case "vllm":
    Console.WriteLine($"DEBUG: Registering LLMClientOpenAI for provider: {llmProvider}");
    builder.Services.AddHttpClient<ILLMClient, LLMClientOpenAI>(c => { c.Timeout = TimeSpan.FromSeconds(120); });
    break;
  case "azure":
    Console.WriteLine("DEBUG: Registering LLMClientAzure");
    builder.Services.AddHttpClient<ILLMClient, LLMClientAzure>(c =>
    {
      c.Timeout = TimeSpan.FromSeconds(120);
    });
    break;
  default:
    Console.WriteLine($"DEBUG: Unknown provider '{llmProvider}', defaulting to LLMClientMock");
    builder.Services.AddSingleton<ILLMClient, LLMClientMock>();
    break;
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

// Enable CORS
app.UseCors("AllowFrontend");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/api/health", () => "ok");

// D-ID Streaming API endpoints
if (!string.IsNullOrEmpty(didApiKey))
{
  // Allow frontend to send empty objects; if source_url is missing, use default avatar URL as fallback
  var defaultAvatar = Environment.GetEnvironmentVariable("DID_DEFAULT_SOURCE_URL") ?? "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";
  app.MapPost("/api/stream/create", async (IHttpClientFactory httpFactory, HttpContext ctx) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
      var body = await reader.ReadToEndAsync();

      // Parse and set default presenter and driver for Clips Streams
      var json = JsonNode.Parse(body)?.AsObject() ?? new JsonObject();
      if (!json.ContainsKey("presenter_id"))
      {
        json["presenter_id"] = "v2_Fiona_NoHands_BlackJacket_ClassRoom@1BOeggEufb"; // Fixed presenter
      }
      if (!json.ContainsKey("driver_id"))
      {
        json["driver_id"] = "dbRUIwY6KY"; // Fixed driver
      }

      using var content = new StringContent(json.ToJsonString(), Encoding.UTF8, MediaTypeNames.Application.Json);
      var resp = await http.PostAsync("/clips/streams", content);

      // ================== NEW DETAILED LOGGING ==================
      Console.WriteLine($"DEBUG: D-ID Response Status Code: {(int)resp.StatusCode}");
      Console.WriteLine("DEBUG: D-ID Response Headers:");
      foreach (var header in resp.Headers)
      {
        Console.WriteLine($"  - {header.Key}: {string.Join(", ", header.Value)}");
      }
      // ==========================================================

      resp.EnsureSuccessStatusCode();

      var didResponseJson = await resp.Content.ReadAsStringAsync();
      //Console.WriteLine($"DEBUG: Raw D-ID Response Body: {didResponseJson}");

      // Return complete D-ID response including stream_id and session_id
      // Frontend will store session_id and send it in subsequent requests
      Console.WriteLine($"DEBUG: Stream created successfully, response contains session_id");

      return Results.Content(didResponseJson, MediaTypeNames.Application.Json, Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (HttpRequestException httpEx)
    {
      Console.WriteLine($"ERROR: HTTP request to D-ID failed: {httpEx.Message}");
      return Results.Problem(detail: httpEx.Message, statusCode: (int?)httpEx.StatusCode);
    }
    catch (Exception ex)
    {
      Console.WriteLine($"ERROR: An unexpected error or validation failure occurred in /api/stream/create: {ex.Message}");
      return Results.Problem(detail: $"Error processing D-ID response: {ex.Message}", statusCode: 502);
    }
  });

  app.MapPost("/api/stream/{id}/sdp", async (IHttpClientFactory httpFactory, string id, HttpContext ctx) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
      var raw = await reader.ReadToEndAsync();

      // Parse JSON request body to get session_id and sdp
      string sessionId = "";
      JsonNode? answerNode = null;

      var trimmed = raw.TrimStart();
      if (trimmed.StartsWith("{"))
      {
        try
        {
          var node = JsonNode.Parse(raw);
          sessionId = node?["session_id"]?.GetValue<string>() ?? "";
          answerNode = node?["answer"];
          if (answerNode == null)
          {
            throw new Exception("No 'answer' field found in JSON body");
          }
        }
        catch (Exception ex)
        {
          Console.WriteLine($"DEBUG: Failed to parse JSON request: {ex.Message}");
          throw; // Let the caller see the error
        }
      }

      // Create the JSON payload that D-ID expects.
      var didPayload = new JsonObject
      {
        ["session_id"] = sessionId,
        // IMPORTANT: Clone the node to add it to the new JSON object

        ["answer"] = answerNode!.DeepClone()

      };
      var jsonPayload = didPayload.ToJsonString();

      var req = new HttpRequestMessage(HttpMethod.Post, $"/clips/streams/{id}/sdp")
      {
        // Set the content to be JSON, as D-ID expects
        Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
      };

      // The D-ID API uses a session_id in the body/cookie, but also needs an Authorization header
      // Make sure your httpFactory configures the "did" client with the correct base address
      // and Authorization header. The official docs use `Authorization: Basic {YOUR_DID_API_KEY}`.

      // The cookie logic you had might still be relevant if D-ID requires it in addition to the body property.
      // It's safer to include it in both the JSON body and as a cookie.
      if (!string.IsNullOrEmpty(sessionId))
      {
        req.Headers.Add("Cookie", sessionId);
      }

      var resp = await http.SendAsync(req);
      var answerText = await resp.Content.ReadAsStringAsync();
      Console.WriteLine($"[DID] sdp -> {(int)resp.StatusCode} id={id}, body-len={answerText.Length}");
      // D-ID usually returns empty body or SDP, pass through as-is regardless
      return Results.Content(answerText, "application/sdp", Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (Exception ex)
    {
      return Results.BadRequest(new { error = ex.Message });
    }
  });

  app.MapPost("/api/stream/{id}/ice", async (IHttpClientFactory httpFactory, string id, HttpContext ctx) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
      var requestBody = await reader.ReadToEndAsync();

      string sessionId = "";

      var node = JsonNode.Parse(requestBody);
      sessionId = node?["session_id"]?.GetValue<string>() ?? "";

      var req = new HttpRequestMessage(HttpMethod.Post, $"/clips/streams/{id}/ice")
      {
        // Use the original, unmodified body from the frontend
        Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
      };

      var resp = await http.SendAsync(req);

      var responseContent = await resp.Content.ReadAsStringAsync();
      var responseContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
      return Results.Content(responseContent, responseContentType, Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (Exception ex)
    {
      return Results.BadRequest(new { error = ex.Message });
    }
  });

  app.MapPost("/api/stream/{id}", async (IHttpClientFactory httpFactory, string id, HttpContext ctx) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
      var requestBody = await reader.ReadToEndAsync();

      string sessionId = "";

      var node = JsonNode.Parse(requestBody);
      sessionId = node?["session_id"]?.GetValue<string>() ?? "";


      var req = new HttpRequestMessage(HttpMethod.Post, $"/clips/streams/{id}")
      {
        // Use the original, unmodified body from the frontend
        Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
      };

      // It's safe to send the cookie in addition, but the body MUST contain the session_id
      if (!string.IsNullOrEmpty(sessionId))
      {
        req.Headers.Add("Cookie", sessionId);
      }

      var resp = await http.SendAsync(req);

      // This part is fine - it correctly proxies the response back.
      var responseContent = await resp.Content.ReadAsStringAsync();
      var responseContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
      return Results.Content(responseContent, responseContentType, Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (Exception ex)
    {
      return Results.BadRequest(new { error = ex.Message });
    }
  });

  app.MapDelete("/api/stream/{id}", async (IHttpClientFactory httpFactory, string id, HttpContext ctx) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
      var requestBody = await reader.ReadToEndAsync();

      string sessionId = "";

      var node = JsonNode.Parse(requestBody);
      sessionId = node?["session_id"]?.GetValue<string>() ?? "";

      var req = new HttpRequestMessage(HttpMethod.Delete, $"/clips/streams/{id}")
      {
        // Use the original body, which contains the session_id as required
        Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
      };

      if (!string.IsNullOrEmpty(sessionId))
      {
        req.Headers.Add("Cookie", sessionId);
      }

      var resp = await http.SendAsync(req);

      var responseContent = await resp.Content.ReadAsStringAsync();
      var responseContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
      Console.WriteLine($"[DID] delete -> {(int)resp.StatusCode} id={id}");
      return Results.Content(responseContent, responseContentType, Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (Exception ex)
    {
      return Results.BadRequest(new { error = ex.Message });
    }
  });

  // Get available presenters for Clips Streams
  app.MapGet("/api/presenters", async (IHttpClientFactory httpFactory) =>
  {
    try
    {
      var http = httpFactory.CreateClient("did");
      var resp = await http.GetAsync("/clips/presenters");

      var response = await resp.Content.ReadAsStringAsync();
      return Results.Content(response, MediaTypeNames.Application.Json, Encoding.UTF8, (int)resp.StatusCode);
    }
    catch (Exception ex)
    {
      return Results.BadRequest(new { error = ex.Message });
    }
  });

  Console.WriteLine("DEBUG: D-ID Streaming API endpoints registered");
}
else
{
  Console.WriteLine("DEBUG: D-ID API Key not set, streaming endpoints not registered");
}



// ===== Interview Session Management Endpoints =====
var sessionRepo = new InMemoryVideoSessionRepo();

app.MapPost("/api/video-session/create", async (HttpContext ctx) =>
{
  try
  {
    using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
    var body = await reader.ReadToEndAsync();

    List<VideoQuestionDto> questions = new();

    if (!string.IsNullOrWhiteSpace(body))
    {
      try
      {
        var payload = JsonSerializer.Deserialize<JsonElement>(body);
        if (payload.TryGetProperty("questions", out var questionsElement))
        {
          foreach (var q in questionsElement.EnumerateArray())
          {
            var id = q.TryGetProperty("id", out var idProp) ? idProp.GetString() : Guid.NewGuid().ToString();
            var text = q.TryGetProperty("text", out var textProp) ? textProp.GetString() : "";
            var type = q.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : "technical";

            if (!string.IsNullOrEmpty(text))
            {
              questions.Add(new VideoQuestionDto(id!, text, type!));
            }
          }
        }
      }
      catch (Exception ex)
      {
        Console.WriteLine($"DEBUG: Failed to parse questions from request: {ex.Message}");
      }
    }

    var sessionId = sessionRepo.CreateSession(questions.Count > 0 ? questions : null);
    return Results.Json(new { sessionId });
  }
  catch (Exception ex)
  {
    Console.WriteLine($"DEBUG: Create session error: {ex.Message}");
    return Results.BadRequest(new { error = ex.Message });
  }
});

app.MapGet("/api/video-session/{id}/next", (string id) =>
{
  var question = sessionRepo.GetNextQuestion(id);
  return Results.Json(question);
});

app.MapPost("/api/video-session/{id}/answer", async (string id, HttpContext ctx) =>
{
  using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
  var body = await reader.ReadToEndAsync();
  var answer = JsonSerializer.Deserialize<VideoAnswerPayload>(body);
  if (answer != null)
  {
    sessionRepo.SaveAnswer(id, answer);
  }
  return Results.Ok();
});

app.MapPost("/api/video-session/{id}/final-report", (string id) =>
{
  try
  {
    var sessionData = sessionRepo.GetSessionData(id);
    var report = sessionRepo.GenerateMockReport(sessionData);
    return Results.Json(new { report });
  }
  catch (Exception ex)
  {
    Console.WriteLine($"DEBUG: Report generation error: {ex.Message}");
    return Results.Json(new { report = sessionRepo.GenerateMockReport(sessionRepo.GetSessionData(id)) });
  }
});

app.Run();

// ===== Data Models and In-Memory Storage =====
public record VideoQuestionDto(string QuestionId, string Text, string Type);
public record VideoAnswerPayload(string QuestionId, string Transcript, List<string>? Words, List<TimestampWord>? Timestamps);
public record TimestampWord(double OffsetMs, double DurationMs, string Text);
public record SessionData(List<VideoQuestionDto> Questions, List<VideoAnswerPayload> Answers);

public class InMemoryVideoSessionRepo
{
  private readonly ConcurrentDictionary<string, Queue<VideoQuestionDto>> _questions = new();
  private readonly ConcurrentDictionary<string, List<VideoAnswerPayload>> _answers = new();

  public string CreateSession(List<VideoQuestionDto>? customQuestions = null)
  {
    var sessionId = Guid.NewGuid().ToString("N");
    var questionsToUse = customQuestions?.Count > 0 ? customQuestions : GetSampleQuestions();
    var questions = new Queue<VideoQuestionDto>(questionsToUse);
    _questions[sessionId] = questions;
    _answers[sessionId] = new List<VideoAnswerPayload>();
    return sessionId;
  }

  public VideoQuestionDto? GetNextQuestion(string sessionId)
  {
    if (!_questions.TryGetValue(sessionId, out var queue) || queue.Count == 0)
    {
      return new VideoQuestionDto("done", "__DONE__", "end");
    }
    return queue.Dequeue();
  }

  public void SaveAnswer(string sessionId, VideoAnswerPayload answer)
  {
    if (_answers.TryGetValue(sessionId, out var answers))
    {
      answers.Add(answer);
    }
  }

  public SessionData GetSessionData(string sessionId)
  {
    var questions = _questions.TryGetValue(sessionId, out var q) ? q.ToList() : new List<VideoQuestionDto>();
    var answers = _answers.TryGetValue(sessionId, out var a) ? a : new List<VideoAnswerPayload>();
    return new SessionData(questions, answers);
  }

  private static List<VideoQuestionDto> GetSampleQuestions() => new() {
        new("q1", "Please introduce yourself and tell me about your background in software development.", "behavioral"),
        new("q2", "Describe a challenging technical problem you solved recently and how you approached it.", "behavioral"),
        new("q3", "Explain the difference between REST and GraphQL APIs. When would you choose one over the other?", "technical"),
        new("q4", "How would you design a system to handle high traffic? What considerations would you make?", "system-design"),
        new("q5", "Tell me about a time when you had to work with a difficult team member. How did you handle it?", "behavioral")
    };

  public string GenerateMockReport(SessionData data) => JsonSerializer.Serialize(new
  {
    overallScore = 82,
    dimensions = new[] {
            new { name = "Technical Knowledge", score = 8, evidence = new[] { "Demonstrated understanding of core concepts" }, advice = "Continue building on strong foundation" },
            new { name = "Problem Solving", score = 7, evidence = new[] { "Structured approach to challenges" }, advice = "Provide more specific examples" },
            new { name = "Communication", score = 9, evidence = new[] { "Clear and articulate responses" }, advice = "Excellent communication skills" },
            new { name = "Experience", score = 8, evidence = new[] { "Relevant background shared" }, advice = "Highlight specific achievements" }
        },
    keyStrengths = new[] { "Strong communication", "Technical understanding", "Professional attitude" },
    improvements = new[] { "More detailed examples", "Quantify achievements" },
    nextQuestions = new[] { "Describe your experience with cloud platforms", "How do you approach code reviews?" }
  }, new JsonSerializerOptions { WriteIndented = true });
}


