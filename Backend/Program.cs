using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using System.Text;
using System.Text.Json;
using Backend.Contracts;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using Backend.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Polly;
using Polly.Extensions.Http;
using Microsoft.Extensions.Http;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("Default") ??
    builder.Configuration["DB_CONNECTION"];
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("DB_CONNECTION is required.");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireDigit = false;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "zulip-mini-ui";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "zulip-mini-ui";
var jwtSigningKey = builder.Configuration["JWT_SIGNING_KEY"];
if (string.IsNullOrWhiteSpace(jwtSigningKey))
{
    throw new InvalidOperationException("JWT_SIGNING_KEY is required.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            "global",
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 1000,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 1,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    options.AddPolicy("per-user-or-ip", context =>
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        var key = userId ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetSlidingWindowLimiter(
            key,
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 1,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins is { Length: > 0 })
        {
            policy.WithOrigins(allowedOrigins);
        }
        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

var zulipBaseUrl = builder.Configuration["ZULIP_BASE_URL"];
if (string.IsNullOrWhiteSpace(zulipBaseUrl))
{
    throw new InvalidOperationException("ZULIP_BASE_URL is required.");
}

builder.Services.AddHttpClient("zulip", client =>
{
    client.BaseAddress = new Uri(zulipBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(100); // Increased for long polling
})
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retry => TimeSpan.FromSeconds(Math.Pow(2, retry))))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));

builder.Services.AddSingleton(new JwtService(jwtIssuer, jwtAudience, jwtSigningKey));

var tokenEncKey = builder.Configuration["TOKEN_ENC_KEY"];
if (string.IsNullOrWhiteSpace(tokenEncKey))
{
    throw new InvalidOperationException("TOKEN_ENC_KEY is required.");
}
builder.Services.AddSingleton<ITokenProtector>(new AesGcmTokenProtector(tokenEncKey));
builder.Services.AddScoped(_ => new ZulipClient(_.GetRequiredService<IHttpClientFactory>(), zulipBaseUrl));

// Add Controllers support
builder.Services.AddControllers();


builder.Services.AddSingleton<RefreshTokenService>();

builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.MapPost("/api/auth/register", async (
    RegisterRequest request,
    UserManager<AppUser> userManager,
    AppDbContext db,
    ITokenProtector protector,
    IValidator<RegisterRequest> validator,
    IConfiguration config) =>
{
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var inviteCode = config["APP_INVITE_CODE"];
    if (string.IsNullOrWhiteSpace(inviteCode) || request.InviteCode != inviteCode)
    {
        return Results.BadRequest(new { error = "Invalid invite code." });
    }

    var existing = await userManager.FindByEmailAsync(request.Email);
    if (existing is not null)
    {
        return Results.Conflict(new { error = "User already exists." });
    }

    var user = new AppUser { UserName = request.Email, Email = request.Email };
    var createResult = await userManager.CreateAsync(user, request.Password);
    if (!createResult.Succeeded)
    {
        return Results.BadRequest(new { error = string.Join("; ", createResult.Errors.Select(e => e.Description)) });
    }

    var encrypted = protector.Encrypt(request.ZulipToken);
    db.ZulipCredentials.Add(new ZulipCredential
    {
        UserId = user.Id,
        ZulipEmail = request.ZulipEmail,
        TokenEncrypted = encrypted.CipherText,
        TokenNonce = encrypted.Nonce
    });

    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireRateLimiting("per-user-or-ip");

app.MapPost("/api/auth/login", async (
    LoginRequest request,
    IValidator<LoginRequest> validator,
    UserManager<AppUser> userManager,
    JwtService jwt,
    RefreshTokenService refreshTokens,
    AppDbContext db) =>
{
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var user = await userManager.FindByEmailAsync(request.Email);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    var valid = await userManager.CheckPasswordAsync(user, request.Password);
    if (!valid)
    {
        return Results.Unauthorized();
    }

    var token = jwt.CreateToken(user);
    var refreshToken = refreshTokens.GenerateToken();
    var refreshHash = refreshTokens.HashToken(refreshToken);
    db.RefreshTokens.Add(refreshTokens.CreateEntity(user.Id, refreshHash, TimeSpan.FromDays(7)));
    await db.SaveChangesAsync();
    return Results.Ok(new { token, refresh_token = refreshToken });
}).RequireRateLimiting("per-user-or-ip");

app.MapGet("/api/auth/me", (ClaimsPrincipal user) =>
{
    var email = user.FindFirstValue(ClaimTypes.Email);
    return Results.Ok(new { email });
}).RequireAuthorization().RequireRateLimiting("per-user-or-ip");

app.MapPut("/api/auth/zulip", async (
    UpdateZulipTokenRequest request,
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    IValidator<UpdateZulipTokenRequest> validator,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(request, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.Unauthorized();
    }

    var record = await db.ZulipCredentials.SingleOrDefaultAsync(x => x.UserId == userId, ct);
    if (record is null)
    {
        return Results.NotFound();
    }

    var encrypted = protector.Encrypt(request.ZulipToken);
    record.ZulipEmail = request.ZulipEmail;
    record.TokenEncrypted = encrypted.CipherText;
    record.TokenNonce = encrypted.Nonce;
    record.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { ok = true });
}).RequireAuthorization().RequireRateLimiting("per-user-or-ip");

app.MapPost("/api/auth/refresh", async (
    RefreshRequest request,
    IValidator<RefreshRequest> validator,
    UserManager<AppUser> userManager,
    JwtService jwt,
    RefreshTokenService refreshTokens,
    AppDbContext db,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(request, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var hashed = refreshTokens.HashToken(request.RefreshToken);
    var stored = await db.RefreshTokens
        .OrderByDescending(x => x.CreatedAtUtc)
        .FirstOrDefaultAsync(x => x.TokenHash == hashed, ct);

    if (stored is null || stored.RevokedAtUtc is not null || stored.ExpiresAtUtc <= DateTime.UtcNow)
    {
        return Results.Unauthorized();
    }

    var user = await userManager.FindByIdAsync(stored.UserId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    stored.RevokedAtUtc = DateTime.UtcNow;
    var newRefresh = refreshTokens.GenerateToken();
    var newHash = refreshTokens.HashToken(newRefresh);
    stored.ReplacedByTokenHash = newHash;

    db.RefreshTokens.Add(refreshTokens.CreateEntity(user.Id, newHash, TimeSpan.FromDays(7)));
    await db.SaveChangesAsync(ct);

    var token = jwt.CreateToken(user);
    return Results.Ok(new { token, refresh_token = newRefresh });
}).RequireRateLimiting("per-user-or-ip");

var api = app.MapGroup("/api").RequireAuthorization().RequireRateLimiting("per-user-or-ip");

api.MapGet("/streams", async (
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    ZulipClient zulip,
    CancellationToken ct) =>
{
    try
    {
        var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
        using var doc = await zulip.GetAsync("/api/v1/users/me/subscriptions",
            new Dictionary<string, string?> { ["include_subscribers"] = "false" }, zulipEmail, zulipToken, ct);

        var streams = doc.RootElement.GetProperty("subscriptions")
            .EnumerateArray()
            .Select(sub => new
            {
                id = sub.GetProperty("stream_id").GetInt32(),
                name = sub.GetProperty("name").GetString() ?? string.Empty
            })
            .ToArray();

        return Results.Ok(new { streams });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error fetching streams: {ex}");
        return Results.Problem(detail: ex.Message, statusCode: 500);
    }
});

api.MapGet("/streams/{streamId:int}/topics", async (
    int streamId,
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    ZulipClient zulip,
    CancellationToken ct) =>
{
    try
    {
        var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
        using var doc = await zulip.GetAsync($"/api/v1/users/me/{streamId}/topics", null, zulipEmail, zulipToken, ct);

        // Check for error result from Zulip
        if (doc.RootElement.TryGetProperty("result", out var res) && res.GetString() == "error")
        {
            var msg = doc.RootElement.GetProperty("msg").GetString();
            Console.WriteLine($"Zulip Error fetching topics: {msg}");
            return Results.Problem(detail: msg, statusCode: 400);
        }

        var topics = doc.RootElement.GetProperty("topics")
            .EnumerateArray()
            .Select(t => {
                var maxId = 0;
                if (t.TryGetProperty("max_id", out var mId)) maxId = mId.GetInt32();
                else if (t.TryGetProperty("max_message_id", out var mmId)) maxId = mmId.GetInt32();

                return new
                {
                    name = t.GetProperty("name").GetString() ?? string.Empty,
                    max_message_id = maxId
                };
            })
            .ToArray();

        return Results.Ok(new { topics });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error fetching topics for stream {streamId}: {ex}");
        return Results.Problem(detail: ex.Message, statusCode: 500);
    }
});

api.MapGet("/messages", async (
    int streamId,
    string topic,
    string? anchor,
    int? numBefore,
    int? numAfter,
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    ZulipClient zulip,
    CancellationToken ct) =>
{
    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    var narrow = new[]
    {
        new { @operator = "stream", operand = (object)streamId },
        new { @operator = "topic", operand = (object)topic }
    };

    var query = new Dictionary<string, string?>
    {
        ["anchor"] = anchor ?? "latest",
        ["num_before"] = (numBefore ?? 50).ToString(),
        ["num_after"] = (numAfter ?? 0).ToString(),
        ["narrow"] = JsonSerializer.Serialize(narrow),
        ["apply_markdown"] = "true"
    };

    using var doc = await zulip.GetAsync("/api/v1/messages", query, zulipEmail, zulipToken, ct);

    var messages = doc.RootElement.GetProperty("messages")
        .EnumerateArray()
        .Select(message => new
        {
            id = message.GetProperty("id").GetInt32(),
            sender_full_name = message.GetProperty("sender_full_name").GetString() ?? string.Empty,
            sender_email = message.GetProperty("sender_email").GetString() ?? string.Empty,
            timestamp = message.GetProperty("timestamp").GetInt64(),
            content = message.TryGetProperty("rendered_content", out var rc) ? rc.GetString() : message.GetProperty("content").GetString() ?? string.Empty
        })
        .ToArray();

    return Results.Ok(new { messages });
});

api.MapPost("/messages/flags/read", async (
    [FromBody] List<int> messageIds,
    AppDbContext db,
    ZulipClient zulip,
    ITokenProtector protector,
    ClaimsPrincipal user,
    CancellationToken ct) =>
{
    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    var form = new Dictionary<string, string?>
    {
        ["messages"] = "[" + string.Join(",", messageIds) + "]",
        ["op"] = "add",
        ["flag"] = "read"
    };

    using var result = await zulip.PostFormAsync("/api/v1/messages/flags", form, zulipEmail, zulipToken, ct);
    return Results.Ok();
});

api.MapGet("/proxy/image", async (
    string url,
    AppDbContext db,
    ZulipClient zulip,
    ITokenProtector protector,
    ClaimsPrincipal user,
    IHttpClientFactory httpClientFactory,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest();
    
    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    
    var client = httpClientFactory.CreateClient("zulip");
    
    // Handle both absolute and relative URLs
    var requestUri = url.StartsWith("http") ? new Uri(url) : new Uri(client.BaseAddress!, url);
    var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
    
    var raw = $"{zulipEmail}:{zulipToken}";
    var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", base64);
    request.Headers.UserAgent.ParseAdd("ZulipNetProxyAgent/1.0");

    var response = await client.SendAsync(request, ct);
    if (!response.IsSuccessStatusCode) return Results.StatusCode((int)response.StatusCode);

    var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/png";
    var stream = await response.Content.ReadAsStreamAsync(ct);
    return Results.Stream(stream, contentType);
}).AllowAnonymous();

api.MapGet("/streams/{streamId}/members", async (
    int streamId,
    AppDbContext db,
    ITokenProtector protector,
    ClaimsPrincipal user,
    IHttpClientFactory httpClientFactory,
    CancellationToken ct) =>
{
    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    
    var client = httpClientFactory.CreateClient("zulip");
    // Get stream info which includes subscribers
    var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/streams/{streamId}");
    
    var raw = $"{zulipEmail}:{zulipToken}";
    var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", base64);
    request.Headers.UserAgent.ParseAdd("ZulipNetProxyAgent/1.0");

    var response = await client.SendAsync(request, ct);
    if (!response.IsSuccessStatusCode)
    {
        var errorContent = await response.Content.ReadAsStringAsync(ct);
        return Results.Problem(errorContent, statusCode: (int)response.StatusCode);
    }

    var content = await response.Content.ReadAsStringAsync(ct);
    var doc = JsonDocument.Parse(content);
    
    // Extract subscribers array from stream info
    if (doc.RootElement.TryGetProperty("stream", out var streamElement) &&
        streamElement.TryGetProperty("subscribers", out var subscribersElement))
    {
        // Get user IDs and fetch user details
        var userIds = subscribersElement.EnumerateArray()
            .Select(id => id.GetInt32())
            .ToList();
        
        // Fetch all users to get names and emails
        var usersRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users");
        usersRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", base64);
        usersRequest.Headers.UserAgent.ParseAdd("ZulipNetProxyAgent/1.0");
        
        var usersResponse = await client.SendAsync(usersRequest, ct);
        if (usersResponse.IsSuccessStatusCode)
        {
            var usersContent = await usersResponse.Content.ReadAsStringAsync(ct);
            var usersDoc = JsonDocument.Parse(usersContent);
            
            if (usersDoc.RootElement.TryGetProperty("members", out var membersElement))
            {
                var subscribers = membersElement.EnumerateArray()
                    .Where(u => u.TryGetProperty("user_id", out var uid) && userIds.Contains(uid.GetInt32()))
                    .Select(u => new
                    {
                        user_id = u.GetProperty("user_id").GetInt32(),
                        full_name = u.GetProperty("full_name").GetString(),
                        email = u.GetProperty("email").GetString()
                    })
                    .ToList();
                
                return Results.Ok(new { subscribers });
            }
        }
    }
    
    // Fallback: return empty list
    return Results.Ok(new { subscribers = new object[] { } });
});

api.MapPost("/messages", async (
    SendMessageRequest request,
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    IValidator<SendMessageRequest> validator,
    ZulipClient zulip,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(request, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    var toValue = request.StreamName ?? request.StreamId.ToString();
    var form = new Dictionary<string, string?>
    {
        ["type"] = "stream",
        ["to"] = toValue,
        ["topic"] = request.Topic,
        ["content"] = request.Content
    };

    using var doc = await zulip.PostFormAsync("/api/v1/messages", form, zulipEmail, zulipToken, ct);
    var root = doc.RootElement;
    var messageId = root.TryGetProperty("id", out var idProp)
        ? idProp.GetInt32()
        : root.GetProperty("message_id").GetInt32();
    return Results.Ok(new { message_id = messageId });
});

api.MapPost("/upload/image", async (
    IFormFile file,
    AppDbContext db,
    ZulipClient zulip,
    ITokenProtector protector,
    ClaimsPrincipal user,
    IHttpClientFactory httpClientFactory,
    CancellationToken ct) =>
{
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "No file provided" });

    // Validate file type
    var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
    if (!allowedTypes.Contains(file.ContentType))
        return Results.BadRequest(new { error = "Invalid file type. Only images are allowed." });

    // Validate file size (max 10MB)
    if (file.Length > 10 * 1024 * 1024)
        return Results.BadRequest(new { error = "File too large. Maximum size is 10MB." });

    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    
    var client = httpClientFactory.CreateClient("zulip");
    var raw = $"{zulipEmail}:{zulipToken}";
    var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    
    using var content = new MultipartFormDataContent();
    using var fileStream = file.OpenReadStream();
    using var streamContent = new StreamContent(fileStream);
    streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
    content.Add(streamContent, "file", file.FileName);

    var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/user_uploads")
    {
        Content = content
    };
    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", base64);
    request.Headers.UserAgent.ParseAdd("ZulipNetProxyAgent/1.0");

    var response = await client.SendAsync(request, ct);
    if (!response.IsSuccessStatusCode)
    {
        var errorContent = await response.Content.ReadAsStringAsync(ct);
        return Results.Problem(errorContent, statusCode: (int)response.StatusCode);
    }

    var responseContent = await response.Content.ReadAsStringAsync(ct);
    var doc = JsonDocument.Parse(responseContent);
    var uri = doc.RootElement.GetProperty("uri").GetString();
    
    return Results.Ok(new { uri });
}).DisableAntiforgery();


api.MapGet("/events/register", async (
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    ZulipClient zulip,
    CancellationToken ct) =>
{
    var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, ct);
    var form = new Dictionary<string, string?>
    {
        ["event_types"] = JsonSerializer.Serialize(new[] { "message", "reaction", "presence", "typing" })
    };

    using var doc = await zulip.PostFormAsync("/api/v1/register", form, zulipEmail, zulipToken, ct);
    var queueId = doc.RootElement.GetProperty("queue_id").GetString() ?? string.Empty;
    var lastEventId = doc.RootElement.GetProperty("last_event_id").GetInt64();
    return Results.Ok(new { queue_id = queueId, last_event_id = lastEventId });
});

api.MapGet("/events/stream", async (
    HttpContext context,
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    ZulipClient zulip,
    CancellationToken cancellationToken) =>
{
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("X-Accel-Buffering", "no");
    context.Response.ContentType = "text/event-stream";
    context.Response.Headers.Append("Connection", "keep-alive");
    try
    {
        // 1. Get credentials
        var (zulipEmail, zulipToken) = await GetZulipCredentials(user, db, protector, cancellationToken);

        // 2. Register queue
        // Register event queue
        using var regDoc = await zulip.PostFormAsync("/api/v1/register", new Dictionary<string, string?>
        {
            ["event_types"] = "[\"message\"]",
            ["fetch_event_types"] = "[\"message\", \"unread_msgs\"]",
            ["apply_markdown"] = "true"
        }, zulipEmail, zulipToken, cancellationToken);

        if (!regDoc.RootElement.TryGetProperty("queue_id", out var qIdEl))
        {
             Console.WriteLine($"Zulip register queue failed: {regDoc.RootElement}");
             context.Response.StatusCode = 500;
             await context.Response.WriteAsync("Failed to register Zulip queue", cancellationToken);
             return;
        }

        var queueId = qIdEl.GetString()!;
        var lastEventId = regDoc.RootElement.GetProperty("last_event_id").GetInt32();

        Console.WriteLine($"SSE Connected: QueueId={queueId}, LastEventId={lastEventId}");

        // Send initial unreads and base url as metadata
        if (regDoc.RootElement.TryGetProperty("unread_msgs", out var unreads))
        {
            var metaJson = JsonSerializer.Serialize(new { 
                type = "metadata", 
                unread_msgs = unreads,
                zulip_base_url = zulipBaseUrl 
            });
            await context.Response.WriteAsync($"data: {metaJson}\n\n", cancellationToken);
            await context.Response.Body.FlushAsync(cancellationToken);
        }
        else 
        {
            Console.WriteLine("No initial unread_msgs found in Zulip register response.");
        }

        // 3. Loop for events
        context.Response.Headers.Append("Connection", "keep-alive");

        // Simple loop
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                using var eventsDoc = await zulip.GetAsync("/api/v1/events", new Dictionary<string, string?>
                {
                    ["queue_id"] = queueId,
                    ["last_event_id"] = lastEventId.ToString(),
                    ["dont_block"] = "false" // We want long polling
                }, zulipEmail, zulipToken, cancellationToken);

                if (eventsDoc.RootElement.TryGetProperty("events", out var eventsArr))
                {
                    foreach (var evt in eventsArr.EnumerateArray())
                    {
                        var evtId = evt.GetProperty("id").GetInt32();
                        if (evtId > lastEventId) lastEventId = evtId;

                        var json = evt.GetRawText();
                        // Send SSE format
                        await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                        await context.Response.Body.FlushAsync(cancellationToken);
                    }
                }

                // If queue expired or bad request, we might need to re-register.
                // Zulip returns { result: "error", code: "BAD_EVENT_QUEUE_ID" } if expired.
                if (eventsDoc.RootElement.TryGetProperty("result", out var res) && res.GetString() == "error")
                {
                     // For simplicity, verify code and break. Client will reconnect and we'll re-register.
                     Console.WriteLine($"Zulip Polling Error: {eventsDoc.RootElement}");
                     break;
                }
            }
            catch (Exception ex)
            {
                 // Timeout or network error, just log and loop (or break to let client reconnect)
                 Console.WriteLine($"Polling loop error: {ex.Message}");
                 // If token is invalid or something fatal, break.
                 await Task.Delay(2000, cancellationToken);
                 // break; // Let's break to force a clean re-connect logic
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SSE Setup Error: {ex}");
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync($"Error: {ex.Message}", cancellationToken);
    }
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .AllowAnonymous();

app.MapGet("/health/ready", async (
    AppDbContext db,
    IHttpClientFactory httpFactory,
    CancellationToken ct) =>
{
    var dbOk = await db.Database.CanConnectAsync(ct);
    var client = httpFactory.CreateClient("zulip");
    var response = await client.GetAsync($"{zulipBaseUrl}/api/v1/server_settings", ct);
    var zulipOk = response.IsSuccessStatusCode;

    if (dbOk && zulipOk)
    {
        return Results.Ok(new { status = "ready" });
    }

    return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
}).AllowAnonymous();

// Map controller endpoints
app.MapControllers();

app.Run();

static async Task<(string ZulipEmail, string ZulipToken)> GetZulipCredentials(
    ClaimsPrincipal user,
    AppDbContext db,
    ITokenProtector protector,
    CancellationToken ct)
{
    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(userId))
    {
        throw new InvalidOperationException("User not authenticated.");
    }

    var record = await db.ZulipCredentials.SingleOrDefaultAsync(x => x.UserId == userId, ct);
    if (record is null)
    {
        throw new InvalidOperationException("Zulip credentials not found.");
    }

    var token = protector.Decrypt(record.TokenEncrypted, record.TokenNonce);
    return (record.ZulipEmail, token);
}
