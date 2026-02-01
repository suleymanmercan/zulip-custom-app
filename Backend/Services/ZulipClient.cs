using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Backend.Services;

public class ZulipClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _baseUrl;

    public ZulipClient(IHttpClientFactory httpClientFactory, string baseUrl)
    {
        _httpClientFactory = httpClientFactory;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task<JsonDocument> GetAsync(string path, IDictionary<string, string?>? query, string zulipEmail, string zulipToken, CancellationToken ct = default)
    {
        var url = BuildUrl(path, query);
        Console.WriteLine($"Zulip API Request: {HttpMethod.Get} {url}");
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        AddAuth(request, zulipEmail, zulipToken);

        var client = _httpClientFactory.CreateClient("zulip");
        var response = await client.SendAsync(request, ct);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            Console.WriteLine($"Zulip API Error [{response.StatusCode}]: {errorBody}");
            response.EnsureSuccessStatusCode();
        }

        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    public async Task<JsonDocument> PostFormAsync(string path, IDictionary<string, string?> form, string zulipEmail, string zulipToken, CancellationToken ct = default)
    {
        var url = BuildUrl(path, null);
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        AddAuth(request, zulipEmail, zulipToken);
        request.Content = new FormUrlEncodedContent(form);

        var client = _httpClientFactory.CreateClient("zulip");
        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    public async Task<JsonDocument> PatchFormAsync(string path, IDictionary<string, string?> form, string zulipEmail, string zulipToken, CancellationToken ct = default)
    {
        var url = BuildUrl(path, null);
        using var request = new HttpRequestMessage(HttpMethod.Patch, url);
        AddAuth(request, zulipEmail, zulipToken);
        request.Content = new FormUrlEncodedContent(form);

        var client = _httpClientFactory.CreateClient("zulip");
        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    private string BuildUrl(string path, IDictionary<string, string?>? query)
    {
        var sb = new StringBuilder();
        sb.Append(_baseUrl);
        if (!path.StartsWith("/"))
        {
            // Do nothing, we handle slash below
        }
        
        // Ensure exactly one slash between base and path
        sb.Append('/'); 
        sb.Append(path.TrimStart('/'));

        if (query is { Count: > 0 })
        {
            var first = true;
            foreach (var pair in query)
            {
                if (pair.Value is null)
                {
                    continue;
                }
                sb.Append(first ? '?' : '&');
                first = false;
                sb.Append(Uri.EscapeDataString(pair.Key));
                sb.Append('=');
                sb.Append(Uri.EscapeDataString(pair.Value));
            }
        }

        return sb.ToString();
    }

    private static void AddAuth(HttpRequestMessage request, string zulipEmail, string zulipToken)
    {
        var raw = $"{zulipEmail}:{zulipToken}";
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", base64);
        request.Headers.UserAgent.ParseAdd("ZulipNetProxyAgent/1.0");
    }
}
