// Data/DbInitializer.cs
using Microsoft.AspNetCore.Identity;

namespace SynaptechERP.API.Data;

public static class DbInitializer
{
    public static async Task SeedAdminAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();

        var adminEmail = configuration["AdminSeed:Email"]?.Trim().ToLower();
        var adminPassword = configuration["AdminSeed:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail))
            throw new InvalidOperationException("AdminSeed:Email is not configured.");

        if (string.IsNullOrWhiteSpace(adminPassword))
            throw new InvalidOperationException("AdminSeed:Password is not configured.");

        // Already exists? Nothing to do.
        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing != null) return;

        // Only creates the Identity user. NO Employee row for admin.
        var adminUser = new AppUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(adminUser, adminPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to create Admin user: {errors}");
        }
    }
}