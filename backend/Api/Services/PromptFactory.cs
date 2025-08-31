namespace AiInterviewer.Api.Services;

public static class PromptFactory
{
  /// <summary>
  /// Legacy version by ratio (total + techRatio): Kept for backward compatibility when you already have this calling path.
  /// Recommend using BuildQuestionGenPromptByCounts below for better clarity.
  /// </summary>
  public static string BuildQuestionGenPrompt(string role, int total, int techRatio)
  {
    var tech = Math.Max(0, Math.Min(total, (int)Math.Round(total * (techRatio / 100.0))));
    var bg = Math.Max(0, total - tech);
    return BuildQuestionGenPromptByCounts(role, tech, bg);
  }

  /// <summary>
  /// Recommended: Explicitly specify the number of technical/background questions to generate, more stable.
  /// </summary>
  public static string BuildQuestionGenPromptByCounts(string role, int techCount, int bgCount)
  {
    var hardConstraints = string.Empty;
    if (techCount == 0)
    {
      hardConstraints += "- All items MUST have type \"background\" only. Generating any \"technical\" item is forbidden.\n";
    }
    if (bgCount == 0)
    {
      hardConstraints += "- All items MUST have type \"technical\" only. Generating any \"background\" item is forbidden.\n";
    }

    return $@"
You are a JSON generator. Output ONLY a valid JSON array. 
DO NOT include explanations, prefixes, code fences, or any extra text.

Role: {role}
Generate exactly {techCount} ""technical"" questions and {bgCount} ""background"" questions.
Each item must follow this schema:
{{
  ""type"": ""technical"" | ""background"",
  ""difficulty"": 1..5,                // integer
  ""text"": ""one clear question, no numbering or quotes around terms unnecessarily"",
  ""tags"": [""short-tag-1"", ""short-tag-2""],
  ""expectedPoints"": [""key point 1"", ""key point 2"", ""key point 3""]
}}

Rules:
- type must be exactly ""technical"" or ""background"".
- difficulty must be an integer from 1 to 5.
- text should be one sentence, no leading numbering like ""1."" or ""Q:"".
- tags: 1-3 short tokens.
- expectedPoints: 2-4 concise bullet points, each a short phrase.
- Return ONLY the JSON array. No prose, no backticks, no trailing commas.
{hardConstraints}

Now produce exactly {techCount + bgCount} items in a single JSON array with the required mix:
- {techCount} items where ""type"": ""technical"" 
- {bgCount} items where ""type"": ""background""

Output ONLY the JSON array:";
  }

  // Follow-up question functionality has been removed, this method is no longer used

  /// <summary>
  /// Single question evaluation: Generate detailed evaluation for each question and answer
  /// </summary>
  public static string BuildQuestionEvaluationPrompt(string questionText, string answerText, string questionType, int difficulty)
  {
    var difficultyText = difficulty switch
    {
      1 => "Beginner",
      2 => "Beginner-Intermediate",
      3 => "Intermediate",
      4 => "Intermediate-Advanced",
      5 => "Advanced",
      _ => "Intermediate"
    };

    return $@"
You are an expert technical interviewer evaluating a candidate's response.

Question: {questionText}
Question Type: {questionType}
Difficulty Level: {difficultyText}

Candidate's Answer: {answerText}

Please evaluate this answer and provide feedback in JSON format:

Rules:
- Output ONLY a JSON object, no prose, no code fences, no trailing commas.
- Use this exact schema:
{{
  ""score"": 1-10,                    // Overall score for this specific question
  ""strengths"": [""key strength 1"", ""key strength 2""],
  ""weaknesses"": [""area for improvement 1"", ""area for improvement 2""],
  ""feedback"": ""2-3 sentence constructive feedback"",
  ""suggestions"": [""specific improvement suggestion 1"", ""suggestion 2""]
}}

Evaluation Criteria:
- Consider the question difficulty and type
- Evaluate technical accuracy, completeness, and clarity
- Assess problem-solving approach and reasoning
- Consider communication effectiveness
- Be constructive and specific in feedback

Output ONLY the JSON object.";
  }

  /// <summary>
  /// Complete scoring report: Includes overall score and detailed evaluation for each question
  /// </summary>
  public static string BuildReportPrompt(string transcript)
  {
    return $@"
You are a hiring committee summarizer. Produce a comprehensive scoring report in JSON.

Interview Record (Q/A transcript):
{transcript}

Rules:
- Output ONLY a JSON object, no prose, no code fences, no trailing commas.
- Use this exact schema:
{{
  ""Overall"": ""0-10"",  // Overall score as a string (e.g., ""7.5"")
  ""Verdict"": ""Pass"" | ""Improve"" | ""Reject"",
  ""QuestionEvaluations"": [
    {{
      ""QuestionText"": ""The question that was asked"",
      ""UserAnswer"": ""The candidate's answer"",
      ""Feedback"": ""2-3 sentence constructive feedback on the answer"",
      ""Strengths"": [""key strength 1"", ""key strength 2""],
      ""Weaknesses"": [""area for improvement 1"", ""area for improvement 2""],
      ""Suggestions"": [""specific improvement suggestion 1"", ""suggestion 2""],
      ""Score"": 1-10  // Individual question score
    }}
  ]
}}

Constraints:
- The overall score should reflect the candidate's performance across all questions
- Consider technical accuracy, communication clarity, and problem-solving ability
- Each question evaluation should be based on the Q/A pairs in the transcript
- Strengths, weaknesses, and suggestions should be specific and actionable
- Individual question scores should contribute to the overall score
- Output ONLY the JSON object.";
  }
}
