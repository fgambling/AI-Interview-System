namespace AiInterviewer.Api.Services;

public record ChatMessage(string role, string content);

public interface ILLMClient
{
    Task<string> ChatAsync(IEnumerable<ChatMessage> messages, float temperature = 0.6f, int maxTokens = 800, CancellationToken ct = default);
}


