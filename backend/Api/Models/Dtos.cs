using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiInterviewer.Api.Models;

public record GenRequest(string Role, int Total, int TechRatio);

public record QuestionDTO(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("difficulty")] int Difficulty,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("tags")] List<string> Tags,
    [property: JsonPropertyName("expectedPoints")] List<string> ExpectedPoints
);

public record GenResult(List<QuestionDTO> Questions);

public record CreateSessionReq(Guid? ConfigId, List<QuestionDTO>? Questions);

public record AnswerReq(Guid SessionId, int OrderNo, string AnswerText);



public record ReportResp(ReportJson ReportJson);
