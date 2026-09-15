// Data/DbInitializer.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Models;
using SynaptechERP.API.Controllers;

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

        // 2. Seed System Administrator User
        var adminEmail = configuration["AdminSeed:Email"]?.Trim().ToLower() ?? "admin@synaptech.io";
        var adminPassword = configuration["AdminSeed:Password"] ?? "Admin@123";

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new AppUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (!result.Succeeded)
            {
                Console.WriteLine($"[Seed] Error creating admin {adminEmail}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
        }
        else
        {
            if (!await userManager.CheckPasswordAsync(adminUser, adminPassword))
            {
                await userManager.RemovePasswordAsync(adminUser);
                await userManager.AddPasswordAsync(adminUser, adminPassword);
            }
        }

        if (adminUser != null && !await userManager.IsInRoleAsync(adminUser, "Admin"))
        {
            await userManager.AddToRoleAsync(adminUser, "Admin");
        }
    }

    public static async Task SeedMasterDataAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        // Auto Schema Migration for Conversations, ConversationMembers, Messages
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ChatChannels') THEN
                        ALTER TABLE ""ChatChannels"" RENAME TO ""Conversations"";
                    END IF;
                    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ChatChannelMembers') THEN
                        ALTER TABLE ""ChatChannelMembers"" RENAME TO ""ConversationMembers"";
                        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ConversationMembers' AND column_name = 'ChannelId') THEN
                            ALTER TABLE ""ConversationMembers"" RENAME COLUMN ""ChannelId"" TO ""ConversationId"";
                        END IF;
                    END IF;
                    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ChatMessages') THEN
                        ALTER TABLE ""ChatMessages"" RENAME TO ""Messages"";
                        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Messages' AND column_name = 'ChannelId') THEN
                            ALTER TABLE ""Messages"" RENAME COLUMN ""ChannelId"" TO ""ConversationId"";
                        END IF;
                    END IF;
                END $$;

                ALTER TABLE ""Conversations"" ADD COLUMN IF NOT EXISTS ""CreatedByUserId"" text NULL;
                ALTER TABLE ""Conversations"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone DEFAULT NOW();
                ALTER TABLE ""ConversationMembers"" ADD COLUMN IF NOT EXISTS ""LastReadAt"" timestamp with time zone NULL;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""EditedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""DeletedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsDeleted"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsDelivered"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsRead"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""ReadAt"" timestamp with time zone NULL;
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Migration Warning] {ex.Message}");
        }

        // 0. Remove all artificial dummy/mock seed accounts permanently
        var dummyEmails = new[] { "hr@gmail.com", "riya.shah@synaptech.io", "manager@synaptech.io", "employee@synaptech.io", "rohan.mehta@synaptech.io", "mansi@synaptech.io" };
        foreach (var dummyEmail in dummyEmails)
        {
            var dummyEmps = await db.Employees
                .Where(e => e.Email.ToLower() == dummyEmail)
                .ToListAsync();

            foreach (var emp in dummyEmps)
            {
                var docs = await db.EmployeeDocuments.Where(d => d.EmployeeId == emp.Id).ToListAsync();
                db.EmployeeDocuments.RemoveRange(docs);

                var employments = await db.EmployeeEmployments.Where(e => e.EmployeeId == emp.Id).ToListAsync();
                db.EmployeeEmployments.RemoveRange(employments);

                var attendance = await db.AttendanceRecords.Where(a => a.EmployeeId == emp.Id).ToListAsync();
                db.AttendanceRecords.RemoveRange(attendance);

                db.Employees.Remove(emp);
            }

            if (dummyEmps.Any())
            {
                await db.SaveChangesAsync();
            }

            var dummyUser = await userManager.FindByEmailAsync(dummyEmail);
            if (dummyUser != null)
            {
                await userManager.DeleteAsync(dummyUser);
            }
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

            // Ensure Identity user exists and has corresponding role for ALL employees
            var normEmail = emp.Email.Trim().ToLower();
            AppUser? appUser = null;
            if (!string.IsNullOrEmpty(emp.UserId))
            {
                appUser = await userManager.FindByIdAsync(emp.UserId);
            }
            if (appUser == null)
            {
                appUser = await userManager.FindByEmailAsync(normEmail)
                    ?? await db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normEmail);
            }

            if (appUser == null)
            {
                appUser = new AppUser
                {
                    UserName = normEmail,
                    NormalizedUserName = normEmail.ToUpperInvariant(),
                    Email = normEmail,
                    NormalizedEmail = normEmail.ToUpperInvariant(),
                    EmailConfirmed = true
                };
                var createRes = await userManager.CreateAsync(appUser, "Employee@123");
                if (createRes.Succeeded)
                {
                    emp.UserId = appUser.Id;
                }
            }
            else
            {
                emp.UserId = appUser.Id;
                appUser.NormalizedEmail = normEmail.ToUpperInvariant();
                appUser.NormalizedUserName = normEmail.ToUpperInvariant();
                await userManager.UpdateAsync(appUser);
            }

            if (appUser != null)
            {
                var roleToAssign = EmployeesController.ResolveSystemRole(emp.Role);
                var userRoles = await userManager.GetRolesAsync(appUser);
                if (!userRoles.Contains(roleToAssign))
                {
                    if (userRoles.Any())
                    {
                        await userManager.RemoveFromRolesAsync(appUser, userRoles);
                    }
                    await userManager.AddToRoleAsync(appUser, roleToAssign);
                }
            }
        }

        await db.SaveChangesAsync();
    }
}