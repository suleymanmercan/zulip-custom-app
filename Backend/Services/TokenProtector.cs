using System.Security.Cryptography;
using System.Text;

namespace Backend.Services;

public interface ITokenProtector
{
    (string CipherText, string Nonce) Encrypt(string plaintext);
    string Decrypt(string cipherText, string nonce);
}

public class AesGcmTokenProtector : ITokenProtector
{
    private readonly byte[] _key;

    public AesGcmTokenProtector(string keyMaterial)
    {
        using var sha = SHA256.Create();
        _key = sha.ComputeHash(Encoding.UTF8.GetBytes(keyMaterial));
    }

    public (string CipherText, string Nonce) Encrypt(string plaintext)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[16];

        using var aes = new AesGcm(_key);
        aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

        var combined = new byte[ciphertext.Length + tag.Length];
        Buffer.BlockCopy(ciphertext, 0, combined, 0, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, combined, ciphertext.Length, tag.Length);

        return (Convert.ToBase64String(combined), Convert.ToBase64String(nonce));
    }

    public string Decrypt(string cipherText, string nonce)
    {
        var combined = Convert.FromBase64String(cipherText);
        var nonceBytes = Convert.FromBase64String(nonce);

        if (combined.Length < 16)
        {
            throw new CryptographicException("Ciphertext is invalid.");
        }

        var cipher = combined.AsSpan(0, combined.Length - 16).ToArray();
        var tag = combined.AsSpan(combined.Length - 16, 16).ToArray();
        var plaintext = new byte[cipher.Length];

        using var aes = new AesGcm(_key);
        aes.Decrypt(nonceBytes, cipher, tag, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }
}
