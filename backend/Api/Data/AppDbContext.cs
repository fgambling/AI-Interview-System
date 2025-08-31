using AiInterviewer.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AiInterviewer.Api.Data;

public class AppDbContext : DbContext
{
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
  {
  }

  public DbSet<Role> Roles { get; set; }
  public DbSet<InterviewConfig> InterviewConfigs { get; set; }
  public DbSet<Question> Questions { get; set; }
  public DbSet<InterviewSession> InterviewSessions { get; set; }
  public DbSet<SessionQuestion> SessionQuestions { get; set; }
  public DbSet<InterviewReport> InterviewReports { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    base.OnModelCreating(modelBuilder);

    // Configure JSON columns
    modelBuilder.Entity<Question>()
        .Property(q => q.Tags)
        .HasConversion(
            v => string.Join(',', v),
            v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

    modelBuilder.Entity<Question>()
        .Property(q => q.ExpectedPoints)
        .HasConversion(
            v => string.Join(',', v),
            v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

    // Configure SessionQuestion JSON columns
    modelBuilder.Entity<SessionQuestion>()
        .Property(sq => sq.ScoreJson)
        .HasColumnType("jsonb");

    // Configure InterviewReport JSON columns
    modelBuilder.Entity<InterviewReport>()
        .Property(ir => ir.ReportJson)
        .HasColumnType("jsonb");
  }

  // Next step: dotnet ef migrations add init
}


