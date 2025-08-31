using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace AiInterviewer.Api.Services;

public class LLMClientOpenAI : ILLMClient
{
  private readonly HttpClient _httpClient;
  private readonly string _baseUrl;
  private readonly string _model;
  private readonly string _apiKey;
  private readonly ILogger<LLMClientOpenAI> _logger;

  public LLMClientOpenAI(HttpClient httpClient, ILogger<LLMClientOpenAI> logger)
  {
    _httpClient = httpClient;
    _logger = logger;
    _baseUrl = Environment.GetEnvironmentVariable("LLM_BASE_URL") ?? "http://localhost:11434/v1";
    _model = Environment.GetEnvironmentVariable("LLM_MODEL") ?? "llama2:7b";
    _apiKey = Environment.GetEnvironmentVariable("LLM_API_KEY") ?? "dummy";

    _logger.LogInformation("Using Ollama LLM client with model: {Model}, BaseUrl: {BaseUrl}", _model, _baseUrl);
  }

  public async Task<string> ChatAsync(IEnumerable<ChatMessage> messages, float temperature = 0.6f, int maxTokens = 2048, CancellationToken ct = default)
  {
    var request = new
    {
      model = _model,
      messages = messages.Select(m => new { role = m.role, content = m.content }),
      temperature = temperature,
      max_tokens = maxTokens
    };

    var json = JsonSerializer.Serialize(request);
    var content = new StringContent(json, Encoding.UTF8, "application/json");

    // Add API Key (if needed)
    if (!string.IsNullOrEmpty(_apiKey) && _apiKey != "dummy")
    {
      _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
    }

    var response = await _httpClient.PostAsync($"{_baseUrl}/chat/completions", content, ct);
    response.EnsureSuccessStatusCode();

    var responseContent = await response.Content.ReadAsStringAsync(ct);
    var openaiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent);

    return openaiResponse?.choices?.FirstOrDefault()?.message?.content ?? "Unable to get response";
  }

  private class OpenAIResponse
  {
    public List<Choice> choices { get; set; } = new();
  }

  private class Choice
  {
    public Message message { get; set; } = new();
  }

  private class Message
  {
    public string content { get; set; } = string.Empty;
  }
}
