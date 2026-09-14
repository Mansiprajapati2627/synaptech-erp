// Data/DbInitializer.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Data;

public static class DbInitializer
{
    public static async Task SeedAdminAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        // 1. Seed Roles: Admin, HR, Manager, Employee
        string[] roles = new[] { "Admin", "HR", "Manager", "Employee" };
        foreach (var roleName in roles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // 2. Seed Admin User
        var adminEmail = configuration["AdminSeed:Email"]?.Trim().ToLower();
        var adminPassword = configuration["AdminSeed:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail))
            throw new InvalidOperationException("AdminSeed:Email is not configured.");

        if (string.IsNullOrWhiteSpace(adminPassword))
            throw new InvalidOperationException("AdminSeed:Password is not configured.");

        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing == null)
        {
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
            existing = adminUser;
        }

        // Ensure Admin user has Admin role
        if (!await userManager.IsInRoleAsync(existing, "Admin"))
        {
            await userManager.AddToRoleAsync(existing, "Admin");
        }
    }

    public static async Task SeedMasterDataAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        // 0. Remove Rohan Mehta permanently if present
        var rohanList = await db.Employees
            .Where(e => e.Email == "rohan.mehta@synaptech.io" || (e.FirstName == "Rohan" && e.LastName == "Mehta"))
            .ToListAsync();

        foreach (var rohan in rohanList)
        {
            var rohanDocs = await db.EmployeeDocuments.Where(d => d.EmployeeId == rohan.Id).ToListAsync();
            db.EmployeeDocuments.RemoveRange(rohanDocs);

            var rohanEmployments = await db.EmployeeEmployments.Where(e => e.EmployeeId == rohan.Id).ToListAsync();
            db.EmployeeEmployments.RemoveRange(rohanEmployments);

            var rohanAttendance = await db.AttendanceRecords.Where(a => a.EmployeeId == rohan.Id || a.EmployeeName.Contains("Rohan")).ToListAsync();
            db.AttendanceRecords.RemoveRange(rohanAttendance);

            db.Employees.Remove(rohan);
        }

        if (rohanList.Any())
        {
            await db.SaveChangesAsync();
        }

        var rohanUser = await userManager.FindByEmailAsync("rohan.mehta@synaptech.io");
        if (rohanUser != null)
        {
            await userManager.DeleteAsync(rohanUser);
        }

        // 1. Seed EmploymentTypes
        if (!await db.EmploymentTypes.AnyAsync())
        {
            var types = new List<EmploymentType>
            {
                new() { Name = "Full Time", Code = "FT", Description = "Standard permanent full-time employment" },
                new() { Name = "Part Time", Code = "PT", Description = "Part-time scheduled hours" },
                new() { Name = "Intern", Code = "INT", Description = "Trainee or intern position" },
                new() { Name = "Contract", Code = "CON", Description = "Fixed-term contract position" },
                new() { Name = "Temporary", Code = "TEMP", Description = "Temporary assignment" },
                new() { Name = "Consultant", Code = "CNS", Description = "External specialized consultant" }
            };
            await db.EmploymentTypes.AddRangeAsync(types);
        }

        // 2. Seed EmploymentStatuses
        if (!await db.EmploymentStatuses.AnyAsync())
        {
            var statuses = new List<EmploymentStatus>
            {
                new() { Name = "Active", Code = "ACT", Description = "Currently active and working" },
                new() { Name = "Probation", Code = "PROB", Description = "Under evaluation period" },
                new() { Name = "Notice Period", Code = "NOT", Description = "Serving notice period prior to exit" },
                new() { Name = "Resigned", Code = "RES", Description = "Resigned voluntarily" },
                new() { Name = "Terminated", Code = "TERM", Description = "Employment terminated" },
                new() { Name = "Retired", Code = "RET", Description = "Retired from service" },
                new() { Name = "Inactive", Code = "INACT", Description = "Temporarily inactive" }
            };
            await db.EmploymentStatuses.AddRangeAsync(statuses);
        }

        // 3. Seed Departments
        if (!await db.Departments.AnyAsync())
        {
            var initialDepartments = new List<Department>
            {
                new() { Name = "HR", Code = "HR", Description = "Supports the team and keeps people connected.", Status = "Active" },
                new() { Name = "Developer", Code = "DEV", Description = "Builds and maintains the product.", Status = "Active" },
                new() { Name = "Interns", Code = "INT", Description = "Learns, contributes, and grows with the team.", Status = "Active" },
                new() { Name = "Sales", Code = "SALES", Description = "Drives growth and client relationships.", Status = "Active" },
                new() { Name = "Marketing", Code = "MKTG", Description = "Crafts the brand story and outreach.", Status = "Active" },
                new() { Name = "Finance", Code = "FIN", Description = "Manages budgets, payroll and financial health.", Status = "Active" },
                new() { Name = "Operations", Code = "OPS", Description = "Keeps day-to-day operations smooth.", Status = "Active" }
            };
            await db.Departments.AddRangeAsync(initialDepartments);
        }

        // 4. Seed Designations
        if (!await db.Designations.AnyAsync())
        {
            var designations = new List<Designation>
            {
                new() { Name = "Software Developer", Code = "DEV_SW", Description = "Software engineer" },
                new() { Name = "Tech Lead", Code = "DEV_TL", Description = "Technical team lead" },
                new() { Name = "HR Manager", Code = "HR_MGR", Description = "Human Resources Manager" },
                new() { Name = "Sales Manager", Code = "SALES_MGR", Description = "Sales team lead" },
                new() { Name = "Operations Manager", Code = "OPS_MGR", Description = "Operations Lead" }
            };
            await db.Designations.AddRangeAsync(designations);
        }

        // 5. Seed WorkLocations
        if (!await db.WorkLocations.AnyAsync())
        {
            var locations = new List<WorkLocation>
            {
                new() { Name = "Headquarters", Code = "HQ", City = "Mumbai", State = "Maharashtra", Country = "India", Status = "Active" },
                new() { Name = "Remote Office", Code = "REM", City = "Remote", Country = "India", Status = "Active" }
            };
            await db.WorkLocations.AddRangeAsync(locations);
        }

        // 6. Seed Shifts
        if (!await db.Shifts.AnyAsync())
        {
            var shifts = new List<Shift>
            {
                new() { Name = "General Shift", Code = "GEN", StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(18, 0, 0), Description = "09:00 AM to 06:00 PM", Status = "Active" },
                new() { Name = "Morning Shift", Code = "MORN", StartTime = new TimeSpan(7, 0, 0), EndTime = new TimeSpan(16, 0, 0), Description = "07:00 AM to 04:00 PM", Status = "Active" }
            };
            await db.Shifts.AddRangeAsync(shifts);
        }

        await db.SaveChangesAsync();

        // Clean up legacy "User" last names from DB
        var userLastNameEmployees = await db.Employees
            .Where(e => e.LastName == "User" || e.LastName == "user" || e.LastName == "USER")
            .ToListAsync();
        foreach (var emp in userLastNameEmployees)
        {
            emp.LastName = string.Empty;
        }
        if (userLastNameEmployees.Any())
        {
            await db.SaveChangesAsync();
        }

        // 7. Backfill existing legacy Employee rows and assign User roles
        var employees = await db.Employees.Include(e => e.Employment).ToListAsync();
        var defaultType = await db.EmploymentTypes.FirstOrDefaultAsync(t => t.Name == "Full Time");
        var defaultStatus = await db.EmploymentStatuses.FirstOrDefaultAsync(s => s.Name == "Active");

        foreach (var emp in employees)
        {
            if (string.IsNullOrWhiteSpace(emp.FirstName) && string.IsNullOrWhiteSpace(emp.LastName))
            {
                var emailPrefix = emp.Email.Split('@')[0];
                var parts = emailPrefix.Split(new[] { '.', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 1)
                {
                    emp.FirstName = char.ToUpper(parts[0][0]) + parts[0][1..];
                    emp.LastName = string.Empty;
                }
                else
                {
                    emp.FirstName = char.ToUpper(parts[0][0]) + parts[0][1..];
                    emp.LastName = char.ToUpper(parts[1][0]) + parts[1][1..];
                }
            }

            if (emp.LastName == "User" || emp.LastName == "user")
            {
                emp.LastName = string.Empty;
            }

            if (string.IsNullOrWhiteSpace(emp.EmployeeCode))
            {
                emp.EmployeeCode = $"EMP{emp.Id:D4}";
            }

            if (emp.Employment == null)
            {
                emp.Employment = new EmployeeEmployment
                {
                    EmployeeId = emp.Id,
                    EmploymentTypeId = defaultType?.Id,
                    EmploymentStatusId = defaultStatus?.Id,
                    CreatedAt = DateTime.UtcNow
                };
                db.EmployeeEmployments.Add(emp.Employment);
            }

            // Ensure Identity user exists and has corresponding role
            if (!string.IsNullOrEmpty(emp.UserId))
            {
                var appUser = await userManager.FindByIdAsync(emp.UserId);
                if (appUser != null)
                {
                    var validRoles = new[] { "Admin", "HR", "Manager", "Employee" };
                    var roleToAssign = validRoles.Contains(emp.Role) ? emp.Role : "Employee";

                    var userRoles = await userManager.GetRolesAsync(appUser);
                    if (!userRoles.Contains(roleToAssign))
                    {
                        await userManager.AddToRoleAsync(appUser, roleToAssign);
                    }
                }
            }
        }

        await db.SaveChangesAsync();
    }
}