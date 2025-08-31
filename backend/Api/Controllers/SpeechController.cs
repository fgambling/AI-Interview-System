using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace AiInterviewer.Api.Controllers
{
  [ApiController]
  [Route("api/[controller]")]
  public class SpeechController : ControllerBase
  {
    private readonly ILogger<SpeechController> _logger;
    private readonly IConfiguration _configuration;

    public SpeechController(ILogger<SpeechController> logger, IConfiguration configuration)
    {
      _logger = logger;
      _configuration = configuration;
    }

    [HttpGet("token")]
    public async Task<IActionResult> GetToken([FromQuery] string? region = null)
    {
      try
      {
        // Read directly from environment variables instead of through Configuration
        var speechKey = Environment.GetEnvironmentVariable("AZ_SPEECH_KEY");
        var speechRegion = Environment.GetEnvironmentVariable("AZ_SPEECH_REGION") ?? "eastus";

        if (string.IsNullOrEmpty(speechKey))
        {
          _logger.LogError("AZ_SPEECH_KEY not configured");
          return StatusCode(500, new { error = "Speech service not configured" });
        }

        // Prioritize region from environment variables, if not available use query parameter
        var targetRegion = speechRegion;

        _logger.LogInformation("Speech token request - Query region: {QueryRegion}, Env region: {EnvRegion}, Final region: {FinalRegion}",
            region, speechRegion, targetRegion);

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", speechKey);

        var response = await client.PostAsync(
            $"https://{targetRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken",
            null
        );

        if (response.IsSuccessStatusCode)
        {
          var token = await response.Content.ReadAsStringAsync();
          _logger.LogInformation("Speech token generated successfully for region: {Region}", targetRegion);

          return Ok(new
          {
            token = token.Trim('"'), // Remove quotes if present
            region = targetRegion
          });
        }
        else
        {
          _logger.LogError("Failed to get speech token. Status: {Status}, Response: {Response}",
              response.StatusCode, await response.Content.ReadAsStringAsync());
          return StatusCode((int)response.StatusCode, new { error = "Failed to get speech token" });
        }
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "Error getting speech token");
        return StatusCode(500, new { error = "Internal server error" });
      }
    }
  }
}
