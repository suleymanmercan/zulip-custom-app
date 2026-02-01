using System.Security.Cryptography;
using System.Text;
using Backend.Models;

namespace Backend.Services;

public class RefreshTokenService
{
    public string GenerateToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    public string HashToken(string token)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    public RefreshToken CreateEntity(string userId, string tokenHash, TimeSpan ttl)
    {
        return new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.Add(ttl)
        };
    }
}
