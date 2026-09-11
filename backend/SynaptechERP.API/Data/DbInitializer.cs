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

    public static async Task SeedDepartmentsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(db.Departments))
            return;

        var initialDepartments = new List<SynaptechERP.API.Models.Department>
        {
            new()
            {
                Name = "HR",
                Description = "Supports the team and keeps people connected.",
                Lead = "Mansi Prajapati",
                Color = "coral"
            },
            new()
            {
                Name = "Developer",
                Description = "Builds and maintains the product.",
                Lead = "Rohan Mehta",
                Color = "teal"
            },
            new()
            {
                Name = "Interns",
                Description = "Learns, contributes, and grows with the team.",
                Lead = "dhruv",
                Color = "blue"
            },
            new()
            {
                Name = "Sales",
                Description = "Drives growth and client relationships.",
                Lead = null,
                Color = "amber"
            },
            new()
            {
                Name = "Marketing",
                Description = "Crafts the brand story and outreach.",
                Lead = null,
                Color = "purple"
            },
            new()
            {
                Name = "Finance",
                Description = "Manages budgets, payroll and financial health.",
                Lead = null,
                Color = "emerald"
            },
            new()
            {
                Name = "Operations",
                Description = "Keeps day-to-day operations smooth.",
                Lead = null,
                Color = "indigo"
            }
        };

        await db.Departments.AddRangeAsync(initialDepartments);
        await db.SaveChangesAsync();
    }
}