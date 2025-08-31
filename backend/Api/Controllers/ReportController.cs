using AiInterviewer.Api.Models;
using AiInterviewer.Api.Services;
using AiInterviewer.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AiInterviewer.Api.Controllers;

[ApiController]
[Route("api")]
public class ReportController : ControllerBase
{
  private readonly AppDbContext _context;
  private readonly ILLMClient _llmClient;

  public ReportController(AppDbContext context, ILLMClient llmClient)
  {
    _context = context;
    _llmClient = llmClient;
  }

  [HttpPost("session/{id}/report")]
  public async Task<ActionResult<ReportResp>> GenerateReport(Guid id)
  {
    try
    {
      var session = await _context.InterviewSessions
          .Include(s => s.SessionQuestions.OrderBy(sq => sq.OrderNo))
          .FirstOrDefaultAsync(s => s.Id == id);

      if (session == null)
      {
        return NotFound(new { error = "Interview session not found" });
      }

      if (session.Status != "Finished")
      {
        return BadRequest(new { error = "Interview not finished, cannot generate report" });
      }

      // Build interview record
      var transcript = BuildTranscript(session.SessionQuestions);

      // Generate report
      var prompt = PromptFactory.BuildReportPrompt(transcript);
      var messages = new List<ChatMessage>
            {
                new("system", "You are a professional AI interviewer, skilled at generating structured interview scoring reports."),
                new("user", prompt)
            };

      var response = await _llmClient.ChatAsync(messages);

      try
      {
        var reportJson = JsonSerializer.Deserialize<ReportJson>(response);

        if (reportJson == null)
        {
          return BadRequest(new { error = "LLM returned empty report data" });
        }

        // Save report to database
        var interviewReport = new InterviewReport
        {
          Id = Guid.NewGuid(),
          SessionId = id,
          ReportJson = response,
          CreatedAt = DateTime.UtcNow
        };

        _context.InterviewReports.Add(interviewReport);
        await _context.SaveChangesAsync();

        return Ok(new ReportResp(reportJson));
      }
      catch (JsonException ex)
      {
        return BadRequest(new { error = "Invalid report format returned by LLM", details = ex.Message, rawResponse = response });
      }
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to generate report", details = ex.Message });
    }
  }

  private string BuildTranscript(IEnumerable<SessionQuestion> questions)
  {
    var transcript = new System.Text.StringBuilder();

    foreach (var question in questions)
    {
      transcript.AppendLine($"Q{question.OrderNo}: {question.QuestionText}");
      transcript.AppendLine($"A{question.OrderNo}: {question.AnswerText}");

      // Follow-up question functionality has been removed, no longer included in records
      transcript.AppendLine();
    }

    return transcript.ToString().TrimEnd();
  }
}


