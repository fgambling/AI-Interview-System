using AiInterviewer.Api.Models;
using AiInterviewer.Api.Services;
using AiInterviewer.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AiInterviewer.Api.Controllers;

[ApiController]
[Route("api/session")]
public class SessionController : ControllerBase
{
  private readonly AppDbContext _context;
  private readonly ILLMClient _llmClient;

  public SessionController(AppDbContext context, ILLMClient llmClient)
  {
    _context = context;
    _llmClient = llmClient;
  }

  [HttpPost("create")]
  public async Task<ActionResult<object>> CreateSession([FromBody] CreateSessionReq request)
  {
    try
    {
      var session = new InterviewSession
      {
        Id = Guid.NewGuid(),
        Status = "Created",
        CreatedAt = DateTime.UtcNow
      };

      _context.InterviewSessions.Add(session);

      if (request.Questions != null && request.Questions.Any())
      {
        var sessionQuestions = request.Questions.Select((q, index) => new SessionQuestion
        {
          Id = Guid.NewGuid(),
          SessionId = session.Id,
          OrderNo = index + 1,
          QuestionText = q.Text,
          Type = q.Type,
          Difficulty = q.Difficulty,
          CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.SessionQuestions.AddRange(sessionQuestions);
      }

      await _context.SaveChangesAsync();

      return Ok(new { sessionId = session.Id, message = "Interview session created successfully" });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to create session", details = ex.Message });
    }
  }

  [HttpPost("{id}/randomize")]
  public async Task<ActionResult<object>> RandomizeQuestions(Guid id)
  {
    try
    {
      var questions = await _context.SessionQuestions
          .Where(sq => sq.SessionId == id)
          .ToListAsync();

      if (!questions.Any())
      {
        return NotFound(new { error = "No interview questions found" });
      }

      // Random shuffle
      var random = new Random();
      for (int i = questions.Count - 1; i > 0; i--)
      {
        int j = random.Next(i + 1);
        var temp = questions[i].OrderNo;
        questions[i].OrderNo = questions[j].OrderNo;
        questions[j].OrderNo = temp;
      }

      await _context.SaveChangesAsync();

      return Ok(new { message = "Question order has been randomized" });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Randomization failed", details = ex.Message });
    }
  }

  [HttpPost("{id}/start")]
  public async Task<ActionResult<object>> StartSession(Guid id)
  {
    try
    {
      var session = await _context.InterviewSessions.FindAsync(id);
      if (session == null)
      {
        return NotFound(new { error = "Interview session not found" });
      }

      session.Status = "Started";
      session.StartedAt = DateTime.UtcNow;
      await _context.SaveChangesAsync();

      return Ok(new { message = "Interview started" });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to start interview", details = ex.Message });
    }
  }

  [HttpPost("{id}/answer")]
  public async Task<ActionResult<object>> SubmitAnswer(Guid id, [FromBody] AnswerReq request)
  {
    try
    {
      var sessionQuestion = await _context.SessionQuestions
          .FirstOrDefaultAsync(sq => sq.SessionId == id && sq.OrderNo == request.OrderNo);

      if (sessionQuestion == null)
      {
        return NotFound(new { error = "Corresponding question not found" });
      }

      sessionQuestion.AnswerText = request.AnswerText;

      // Follow-up question functionality has been removed, skip directly

      // 2. Generate question evaluation (if answer is not empty)
      string evaluationJson = "{}";
      if (!string.IsNullOrWhiteSpace(request.AnswerText))
      {
        try
        {
          var evaluationPrompt = PromptFactory.BuildQuestionEvaluationPrompt(
              sessionQuestion.QuestionText,
              request.AnswerText,
              sessionQuestion.Type,
              sessionQuestion.Difficulty
          );

          var evaluationMessages = new List<ChatMessage>
                    {
                        new("system", "You are a professional AI interviewer, skilled at providing detailed evaluation of candidate answers."),
                        new("user", evaluationPrompt)
                    };

          var evaluationResponse = await _llmClient.ChatAsync(evaluationMessages);
          evaluationJson = evaluationResponse.Trim();
        }
        catch (Exception evalEx)
        {
          // Log when evaluation fails but don't affect main flow
          Console.WriteLine($"Question evaluation failed: {evalEx.Message}");
          evaluationJson = "{}";
        }
      }

      // 3. Save data

      // Save evaluation result
      sessionQuestion.ScoreJson = evaluationJson;

      await _context.SaveChangesAsync();

      // 4. Build response, only include evaluation information
      return Ok(new { message = "Answer submitted successfully", evaluationJson = evaluationJson });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to submit answer", details = ex.Message });
    }
  }

  [HttpGet("{id}/next")]
  public async Task<ActionResult<object>> GetNextQuestion(Guid id)
  {
    try
    {
      var nextQuestion = await _context.SessionQuestions
          .Where(sq => sq.SessionId == id && string.IsNullOrEmpty(sq.AnswerText))
          .OrderBy(sq => sq.OrderNo)
          .FirstOrDefaultAsync();

      if (nextQuestion == null)
      {
        return Ok(new { message = "All questions have been answered" });
      }

      return Ok(new
      {
        orderNo = nextQuestion.OrderNo,
        question = nextQuestion.QuestionText,
        type = nextQuestion.Type,
        difficulty = nextQuestion.Difficulty
      });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to get next question", details = ex.Message });
    }
  }

  [HttpPost("{id}/finish")]
  public async Task<ActionResult<object>> FinishSession(Guid id)
  {
    try
    {
      var session = await _context.InterviewSessions.FindAsync(id);
      if (session == null)
      {
        return NotFound(new { error = "Interview session not found" });
      }

      session.Status = "Finished";
      session.EndedAt = DateTime.UtcNow;
      await _context.SaveChangesAsync();

      return Ok(new { message = "Interview finished" });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { error = "Failed to finish interview", details = ex.Message });
    }
  }


}


