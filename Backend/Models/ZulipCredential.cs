namespace Backend.Models;

public class ZulipCredential
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }
    public string ZulipEmail { get; set; } = string.Empty;
    public string TokenEncrypted { get; set; } = string.Empty;
    public string TokenNonce { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
