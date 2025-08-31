using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace AiInterviewer.Api.Services;

public class LLMClientAzure : ILLMClient
{
  private readonly HttpClient _httpClient;
  private readonly string _baseUrl;
  private readonly string _model;
  private readonly string _apiKey;
  private readonly ILogger<LLMClientAzure> _logger;

  public LLMClientAzure(HttpClient httpClient, ILogger<LLMClientAzure> logger)
  {
    _httpClient = httpClient;
    _logger = logger;
    _baseUrl = Environment.GetEnvironmentVariable("LLM_BASE_URL") ?? throw new ArgumentNullException("LLM_BASE_URL environment variable is required");
    _model = Environment.GetEnvironmentVariable("LLM_MODEL") ?? "gpt-3.5-turbo";
    _apiKey = Environment.GetEnvironmentVariable("LLM_API_KEY") ?? throw new ArgumentNullException("LLM_API_KEY environment variable is required");

    _logger.LogInformation("Using Azure GPT-OSS LLM client with model: {Model}, BaseUrl: {BaseUrl}", _model, _baseUrl);
  }

  public async Task<string> ChatAsync(IEnumerable<ChatMessage> messages, float temperature = 0.7f, int maxTokens = 1024, CancellationToken ct = default)
  {
    // Build request body, add system message
    var requestMessages = new List<object>
        {
            new { role = "system", content = "You are an interviewer." }
        };

    // Add user messages
    foreach (var message in messages)
    {
      requestMessages.Add(new { role = message.role, content = message.content });
    }

    var request = new
    {
      model = _model,
      messages = requestMessages,
      temperature = temperature,
      max_tokens = maxTokens
    };

    var json = JsonSerializer.Serialize(request);
    var content = new StringContent(json, Encoding.UTF8, "application/json");

    // Set API Key
    _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

    _logger.LogInformation("Sending request to Azure GPT-OSS: {BaseUrl}/v1/chat/completions", _baseUrl);

    var response = await _httpClient.PostAsync($"{_baseUrl}/v1/chat/completions", content, ct);
    response.EnsureSuccessStatusCode();

    var responseContent = await response.Content.ReadAsStringAsync(ct);
    _logger.LogInformation("Received response from Azure GPT-OSS");

    var azureResponse = JsonSerializer.Deserialize<AzureResponse>(responseContent);

    var result = azureResponse?.choices?.FirstOrDefault()?.message?.content ?? "Unable to get response";

    _logger.LogInformation("Azure GPT-OSS response parsed successfully");

    return result;
  }

  private class AzureResponse
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
