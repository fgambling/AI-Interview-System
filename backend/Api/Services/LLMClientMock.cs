using System.Text.Json;

namespace AiInterviewer.Api.Services;

public class LLMClientMock : ILLMClient
{
  private readonly Random _random = new();

  private readonly string[] _mockQuestions = {
        "Please introduce your technical background and experience.",
        "What is the biggest challenge you have encountered in projects?",
        "How do you resolve conflicts in team collaboration?",
        "What is your learning method for new technologies?",
        "Please describe a project you are proud of.",
        "How do you ensure code quality and maintainability?",
        "What is your view on technical debt?",
        "How do you balance development speed and code quality?"
    };

  public Task<string> ChatAsync(IEnumerable<ChatMessage> messages, float temperature = 0.6f, int maxTokens = 800, CancellationToken ct = default)
  {
    var lastMessage = messages.LastOrDefault();
    if (lastMessage?.content.Contains("generate", StringComparison.OrdinalIgnoreCase) == true
        || lastMessage?.content.Contains("interview questions", StringComparison.OrdinalIgnoreCase) == true)
    {
      // Try to parse required technical/background counts from prompt
      var content = lastMessage.content;
      var techCount = 5;
      var bgCount = 5;
      try
      {
        // Parse format like: Generate exactly X "technical" questions and Y "background" questions.
        var marker = "Generate exactly ";
        var idx = content.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (idx >= 0)
        {
          var segment = content.Substring(idx);
          // Roughly parse numbers
          var numbers = System.Text.RegularExpressions.Regex.Matches(segment, "\\d+");
          if (numbers.Count >= 2)
          {
            techCount = int.Parse(numbers[0].Value);
            bgCount = int.Parse(numbers[1].Value);
          }
        }
      }
      catch { /* Use default 5/5 */ }

      var questions = new List<object>();
      for (int i = 0; i < techCount; i++)
      {
        questions.Add(new
        {
          type = "technical",
          difficulty = 2 + (i % 3),
          text = _mockQuestions[i % _mockQuestions.Length],
          tags = new[] { "tech", "mock" },
          expectedPoints = new[] { "point a", "point b", "point c" }
        });
      }
      for (int i = 0; i < bgCount; i++)
      {
        questions.Add(new
        {
          type = "background",
          difficulty = 2 + (i % 2),
          text = _mockQuestions[(i + 2) % _mockQuestions.Length],
          tags = new[] { "background", "mock" },
          expectedPoints = new[] { "example", "communication", "impact" }
        });
      }

      return Task.FromResult(JsonSerializer.Serialize(questions));
    }

    else if (lastMessage?.content.Contains("scoring report", StringComparison.OrdinalIgnoreCase) == true
             || lastMessage?.content.Contains("report", StringComparison.OrdinalIgnoreCase) == true)
    {
      // Return complete scoring report JSON
      var report = new
      {
        Overall = "7.6",
        Verdict = "Pass",
        QuestionEvaluations = new[]
          {
                    new
                    {
                        QuestionText = "What is TypeScript and how does it differ from JavaScript?",
                        UserAnswer = "TypeScript is a superset of JavaScript that adds static typing. It helps catch errors at compile time and provides better tooling support.",
                        Feedback = "Good understanding of TypeScript's core concept. The answer shows awareness of static typing benefits and tooling advantages.",
                        Strengths = new[] { "Clear explanation", "Understanding of benefits", "Tooling awareness" },
                        Weaknesses = new[] { "Could provide more examples", "Missing compilation process details" },
                        Suggestions = new[] { "Add practical examples of type annotations", "Explain the compilation process" },
                        Score = 8
                    },
                    new
                    {
                        QuestionText = "Describe a challenging project you worked on and how you overcame obstacles.",
                        UserAnswer = "I worked on a large-scale e-commerce platform that had performance issues. I implemented caching strategies and database optimization.",
                        Feedback = "Good problem identification and solution approach. The answer demonstrates technical problem-solving skills.",
                        Strengths = new[] { "Problem identification", "Technical solution", "Performance focus" },
                        Weaknesses = new[] { "Could elaborate on specific obstacles", "Missing metrics or results" },
                        Suggestions = new[] { "Provide specific performance metrics", "Detail the obstacles faced" },
                        Score = 7
                    }
                }
      };
      return Task.FromResult(JsonSerializer.Serialize(report));
    }

    // Default return a generic response
    return Task.FromResult("This is a mock response. Please switch to a real LLM provider.");
  }
}
