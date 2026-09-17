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
        var context = services.GetRequiredService<AppDbContext>();
        await context.Database.ExecuteSqlRawAsync(@"
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AspNetUsers' AND column_name='RefreshToken') THEN
                    ALTER TABLE ""AspNetUsers"" ADD COLUMN ""RefreshToken"" text NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AspNetUsers' AND column_name='RefreshTokenExpiryTime') THEN
                    ALTER TABLE ""AspNetUsers"" ADD COLUMN ""RefreshTokenExpiryTime"" timestamp with time zone NULL;
                END IF;
            END $$;
        ");

        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        // 1. Seed Roles: Admin, HR, Manager, Staff
        string[] roles = new[] { "Admin", "HR", "Manager", "Staff" };
        foreach (var roleName in roles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Cleanup legacy "Employee" role if present
        var legacyRole = await roleManager.FindByNameAsync("Employee");
        if (legacyRole != null)
        {
            var empUsers = await userManager.GetUsersInRoleAsync("Employee");
            foreach (var u in empUsers)
            {
                await userManager.RemoveFromRoleAsync(u, "Employee");
                await userManager.AddToRoleAsync(u, "Staff");
            }
            await roleManager.DeleteAsync(legacyRole);
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
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

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
                ALTER TABLE ""PayrollRecords"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone NULL;

                -- Remove legacy Employee role from Identity tables
                DELETE FROM ""AspNetUserRoles"" WHERE ""RoleId"" IN (SELECT ""Id"" FROM ""AspNetRoles"" WHERE UPPER(""Name"") = 'EMPLOYEE');
                DELETE FROM ""AspNetRoles"" WHERE UPPER(""Name"") = 'EMPLOYEE';

                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""EditedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""DeletedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsDeleted"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsDelivered"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""IsRead"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""ReadAt"" timestamp with time zone NULL;
                ALTER TABLE ""AttendanceRecords"" ADD COLUMN IF NOT EXISTS ""BreakLogs"" text NULL;
                ALTER TABLE ""AttendanceRecords"" ADD COLUMN IF NOT EXISTS ""TotalBreakMinutes"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AspNetUsers"" ADD COLUMN IF NOT EXISTS ""RefreshToken"" text NULL;
                ALTER TABLE ""AspNetUsers"" ADD COLUMN IF NOT EXISTS ""RefreshTokenExpiryTime"" timestamp with time zone NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""DepartmentId"" integer NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""DesignationId"" integer NULL;

                CREATE TABLE IF NOT EXISTS ""DepartmentDesignations"" (
                    ""DepartmentId"" integer NOT NULL,
                    ""DesignationId"" integer NOT NULL,
                    PRIMARY KEY (""DepartmentId"", ""DesignationId""),
                    CONSTRAINT ""FK_DepartmentDesignations_Departments_DepartmentId"" FOREIGN KEY (""DepartmentId"") REFERENCES ""Departments"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_DepartmentDesignations_Designations_DesignationId"" FOREIGN KEY (""DesignationId"") REFERENCES ""Designations"" (""Id"") ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ""LeaveRequests"" (
                    ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    ""EmployeeId"" integer NOT NULL,
                    ""EmployeeName"" text NOT NULL,
                    ""LeaveType"" text NOT NULL,
                    ""StartDate"" text NOT NULL,
                    ""EndDate"" text NOT NULL,
                    ""TotalDays"" integer NOT NULL DEFAULT 1,
                    ""Reason"" text NOT NULL,
                    ""Status"" text NOT NULL DEFAULT 'Pending',
                    ""AppliedOn"" timestamp with time zone DEFAULT NOW(),
                    ""ApprovedBy"" text NULL,
                    ""ActionDate"" timestamp with time zone NULL
                );

                CREATE TABLE IF NOT EXISTS ""Projects"" (
                    ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    ""Name"" text NOT NULL,
                    ""Description"" text NULL,
                    ""Owner"" text NULL,
                    ""Status"" text NOT NULL DEFAULT 'On track',
                    ""Progress"" integer NOT NULL DEFAULT 0,
                    ""Color"" text NOT NULL DEFAULT '#6366f1',
                    ""Priority"" text NOT NULL DEFAULT 'Medium',
                    ""StartDate"" text NULL,
                    ""Deadline"" text NULL,
                    ""Members"" text NULL,
                    ""CreatedAt"" timestamp with time zone DEFAULT NOW(),
                    ""UpdatedAt"" timestamp with time zone NULL
                );

                CREATE TABLE IF NOT EXISTS ""Tasks"" (
                    ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    ""ProjectId"" integer NULL,
                    ""ProjectName"" text NULL,
                    ""Title"" text NOT NULL,
                    ""Description"" text NULL,
                    ""Done"" boolean NOT NULL DEFAULT false,
                    ""AssignedTo"" text NULL,
                    ""AssignedToEmployeeId"" integer NULL,
                    ""DueDate"" text NULL,
                    ""Priority"" text NOT NULL DEFAULT 'Medium',
                    ""Status"" text NOT NULL DEFAULT 'To do',
                    ""Comments"" text NULL,
                    ""Subtasks"" text NULL,
                    ""Attachments"" text NULL,
                    ""Activity"" text NULL,
                    ""CreatedAt"" timestamp with time zone DEFAULT NOW(),
                    ""UpdatedAt"" timestamp with time zone NULL
                );

                CREATE TABLE IF NOT EXISTS ""PayrollRecords"" (
                    ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    ""EmployeeId"" integer NOT NULL,
                    ""EmployeeName"" text NOT NULL,
                    ""Email"" text NOT NULL,
                    ""Department"" text NOT NULL,
                    ""Role"" text NOT NULL,
                    ""BaseSalary"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""Allowances"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""Deductions"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""DaysInMonth"" integer NOT NULL DEFAULT 30,
                    ""PresentDays"" integer NOT NULL DEFAULT 0,
                    ""ApprovedLeaveDays"" integer NOT NULL DEFAULT 0,
                    ""PayableDays"" integer NOT NULL DEFAULT 0,
                    ""EarnedBaseSalary"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""EarnedAllowances"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""NetSalary"" numeric(18,2) NOT NULL DEFAULT 0,
                    ""Month"" text NOT NULL,
                    ""Year"" integer NOT NULL,
                    ""Status"" text NOT NULL DEFAULT 'Pending',
                    ""CreatedAt"" timestamp with time zone DEFAULT NOW(),
                    ""UpdatedAt"" timestamp with time zone NULL
                );
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

        // Purge all dummy / old projects and tasks from DB completely
        var allTasks = await db.Tasks.ToListAsync();
        if (allTasks.Any())
        {
            db.Tasks.RemoveRange(allTasks);
        }
        var allProjects = await db.Projects.ToListAsync();
        if (allProjects.Any())
        {
            db.Projects.RemoveRange(allProjects);
        }
        if (allTasks.Any() || allProjects.Any())
        {
            await db.SaveChangesAsync();
        }

        // Seed Departments & Designations & DepartmentDesignations as requested
        var defaultDepts = new (int Id, string Name, string Color)[]
        {
            (1, "Development", "indigo"),
            (2, "HR", "emerald"),
            (3, "Sales", "amber"),
            (4, "Finance", "sky")
        };

        foreach (var (id, name, color) in defaultDepts)
        {
            var dept = await db.Departments.FindAsync(id)
                ?? await db.Departments.FirstOrDefaultAsync(d => d.Name.ToLower() == name.ToLower());

            if (dept == null)
            {
                db.Departments.Add(new Department { Name = name, Color = color, CreatedAt = DateTime.UtcNow });
                await db.SaveChangesAsync();
            }
        }

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
            }
            if (emp.DepartmentId == null && emp.Employment?.DepartmentId != null)
            {
                emp.DepartmentId = emp.Employment.DepartmentId;
            }
            if (emp.DesignationId == null && emp.Employment?.DesignationId != null)
            {
                emp.DesignationId = emp.Employment.DesignationId;
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
                var createRes = await userManager.CreateAsync(appUser);
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
                if (!await roleManager.RoleExistsAsync(roleToAssign))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleToAssign));
                }
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

        // Remove legacy Employee role & user role mappings directly via EF DbContext
        var empRoleEntity = await db.Roles.FirstOrDefaultAsync(r => r.Name != null && r.Name.ToLower() == "employee");
        if (empRoleEntity != null)
        {
            var userRolesToRemove = await db.UserRoles.Where(ur => ur.RoleId == empRoleEntity.Id).ToListAsync();
            db.UserRoles.RemoveRange(userRolesToRemove);
            db.Roles.Remove(empRoleEntity);
            await db.SaveChangesAsync();
        }

        await db.SaveChangesAsync();
    }
}