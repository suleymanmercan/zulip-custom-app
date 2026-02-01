namespace Backend.Contracts;

public record RegisterRequest(string InviteCode, string Email, string Password, string ZulipEmail, string ZulipToken);
public record LoginRequest(string Email, string Password);
public record UpdateZulipTokenRequest(string ZulipEmail, string ZulipToken);
public record SendMessageRequest(int StreamId, string Topic, string Content, string? StreamName);
public record RefreshRequest(string RefreshToken);
