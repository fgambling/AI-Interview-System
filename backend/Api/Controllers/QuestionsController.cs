using AiInterviewer.Api.Models;
using AiInterviewer.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace AiInterviewer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
  private readonly ILLMClient _llmClient;

  public QuestionsController(ILLMClient llmClient)
  {
    _llmClient = llmClient;
  }

  [HttpPost("generate")]
  public async Task<ActionResult<GenResult>> GenerateQuestions([FromBody] GenRequest request)
  {
    try
    {
      var prompt = PromptFactory.BuildQuestionGenPrompt(request.Role, request.Total, request.TechRatio);

      var messages = new List<ChatMessage>
            {
                new("system", "You are a professional interviewer. Generate structured interview questions in valid JSON format only."),
                new("user", prompt)
            };

      var response = await _llmClient.ChatAsync(messages, 0.6f, 2048);

      // Debug: Output LLM raw response
      Console.WriteLine($"DEBUG: LLM Raw Response: {response}");

      // Try to parse JSON response (compatible with array or object wrapping, and extract array from text)
      try
      {
        // Case 1: Direct array
        var questions = JsonSerializer.Deserialize<List<QuestionDTO>>(response);
        if (questions != null && questions.Any())
        {
          return Ok(new GenResult(questions));
        }
      }
      catch { /* Continue trying object parsing */ }

      try
      {
        // Case 2: Object wrapped { "questions": [...] }
        using var doc = JsonDocument.Parse(response);
        if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("questions", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
          var questions = JsonSerializer.Deserialize<List<QuestionDTO>>(arr.GetRawText());
          if (questions != null && questions.Any())
          {
            return Ok(new GenResult(questions));
          }
        }
      }
      catch { /* Continue trying to extract array substring */ }

      try
      {
        // Case 3: Extract array fragment with square brackets from text for parsing (best effort)
        var start = response.IndexOf('[');
        var end = response.LastIndexOf(']');
        if (start >= 0 && end > start)
        {
          var jsonArray = response.Substring(start, end - start + 1);
          var questions = JsonSerializer.Deserialize<List<QuestionDTO>>(jsonArray);
          if (questions != null && questions.Any())
          {
            return Ok(new GenResult(questions));
          }
        }
      }
      catch (Exception ex)
      {
        return BadRequest(new { error = "Invalid JSON format returned by LLM", details = ex.Message, rawResponse = response });
      }

      return BadRequest(new { error = "Unable to parse LLM response", rawResponse = response });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Error occurred while generating questions", details = ex.Message });
    }
  }
}
