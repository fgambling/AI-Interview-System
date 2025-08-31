using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AiInterviewer.Api.Models;

public class Role
{
  [Key]
  public Guid Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class InterviewConfig
{
  [Key]
  public Guid Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public Guid RoleId { get; set; }
  public int TotalQuestions { get; set; }
  public int TechRatio { get; set; }
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  [ForeignKey("RoleId")]
  public virtual Role Role { get; set; } = null!;
}

public class Question
{
  [Key]
  public Guid Id { get; set; }
  public string Type { get; set; } = string.Empty;
  public int Difficulty { get; set; }
  public string Text { get; set; } = string.Empty;
  public List<string> Tags { get; set; } = new();
  public List<string> ExpectedPoints { get; set; } = new();
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class InterviewSession
{
  [Key]
  public Guid Id { get; set; }
  public string Status { get; set; } = "Created"; // Created, Started, Finished
  public DateTime StartedAt { get; set; }
  public DateTime EndedAt { get; set; }
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  public virtual ICollection<SessionQuestion> SessionQuestions { get; set; } = new List<SessionQuestion>();
}

public class SessionQuestion
{
  [Key]
  public Guid Id { get; set; }
  public Guid SessionId { get; set; }
  public int OrderNo { get; set; }
  public string QuestionText { get; set; } = string.Empty;
  public string Type { get; set; } = string.Empty;
  public int Difficulty { get; set; }
  public string AnswerText { get; set; } = string.Empty;

  public string ScoreJson { get; set; } = "{}";
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  [ForeignKey("SessionId")]
  public virtual InterviewSession Session { get; set; } = null!;
}

public class InterviewReport
{
  [Key]
  public Guid Id { get; set; }
  public Guid SessionId { get; set; }
  public string ReportJson { get; set; } = "{}";
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  [ForeignKey("SessionId")]
  public virtual InterviewSession Session { get; set; } = null!;
}

public class QuestionEvaluation
{
  public string QuestionText { get; set; } = string.Empty;
  public string UserAnswer { get; set; } = string.Empty;
  public string Feedback { get; set; } = string.Empty;
  public List<string> Strengths { get; set; } = new();
  public List<string> Weaknesses { get; set; } = new();
  public List<string> Suggestions { get; set; } = new();
  public int Score { get; set; }
}

public class ReportJson
{
  public string Overall { get; set; } = string.Empty;
  public string Verdict { get; set; } = string.Empty;
  public List<QuestionEvaluation> QuestionEvaluations { get; set; } = new();
}


