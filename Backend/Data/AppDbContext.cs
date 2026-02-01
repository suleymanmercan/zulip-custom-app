using Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ZulipCredential> ZulipCredentials => Set<ZulipCredential>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ZulipCredential>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.ZulipEmail).HasMaxLength(256).IsRequired();
            entity.Property(e => e.TokenEncrypted).IsRequired();
            entity.Property(e => e.TokenNonce).IsRequired();
            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<ZulipCredential>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.TokenHash).IsRequired();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
