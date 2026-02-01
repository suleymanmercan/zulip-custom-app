namespace Backend.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string? ReplacedByTokenHash { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAtUtc { get; set; }
}
