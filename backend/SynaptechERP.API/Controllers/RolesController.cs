// Controllers/RolesController.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

public class CreateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class RoleResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public int UserCount { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _context;

    public RolesController(
        RoleManager<IdentityRole> roleManager,
        UserManager<AppUser> userManager,
        AppDbContext context)
    {
        _roleManager = roleManager;
        _userManager = userManager;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleResponseDto>>> GetRoles()
    {
        // 1. Remove legacy Employee role and user mappings via EF Core DbContext
        var empRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name != null && (r.Name.ToLower() == "employee" || r.Name.ToUpper() == "EMPLOYEE"));
        if (empRole != null)
        {
            var userRoles = await _context.UserRoles.Where(ur => ur.RoleId == empRole.Id).ToListAsync();
            _context.UserRoles.RemoveRange(userRoles);
            _context.Roles.Remove(empRole);
            await _context.SaveChangesAsync();
        }

        // 2. Ensure default core system roles exist
        string[] defaultRoles = ["Admin", "HR", "Manager", "Staff"];
        foreach (var def in defaultRoles)
        {
            if (!await _roleManager.RoleExistsAsync(def))
            {
                await _roleManager.CreateAsync(new IdentityRole(def));
            }
        }

        // 3. Get all valid roles except Employee
        var allRoles = await _context.Roles
            .Where(r => r.Name != null && r.Name.ToLower() != "employee")
            .ToListAsync();

        // 4. Load employees with their employment records and designations
        var employees = await _context.Employees
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        // Load Identity users and user-role mappings to build a map of UserId -> List of RoleNames
        var allUserRoles = await (from ur in _context.UserRoles
                                  join r in _context.Roles on ur.RoleId equals r.Id
                                  select new { ur.UserId, RoleName = r.Name })
                                  .ToListAsync();

        var userRolesMap = allUserRoles
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.RoleName ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList()
            );

        // Map every employee to a SINGLE resolved system role
        // Priority: Admin > HR > Manager > Staff
        var employeeRoleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            { "Admin", 0 },
            { "HR", 0 },
            { "Manager", 0 },
            { "Staff", 0 }
        };

        foreach (var emp in employees)
        {
            string des = emp.Employment?.Designation?.Name ?? "";
            string desRole = EmployeesController.ResolveSystemRole(des);

            List<string> roles = new List<string>();
            if (!string.IsNullOrEmpty(emp.UserId) && userRolesMap.TryGetValue(emp.UserId, out var rList))
            {
                roles = rList;
            }

            string resolvedRole = "Staff";

            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)))
            {
                resolvedRole = "Admin";
            }
            else if (roles.Any(r => string.Equals(r, "HR", StringComparison.OrdinalIgnoreCase)) || desRole == "HR")
            {
                resolvedRole = "HR";
            }
            else if (roles.Any(r => string.Equals(r, "Manager", StringComparison.OrdinalIgnoreCase)) || desRole == "Manager")
            {
                resolvedRole = "Manager";
            }
            else
            {
                resolvedRole = "Staff";
            }

            if (employeeRoleCounts.ContainsKey(resolvedRole))
            {
                employeeRoleCounts[resolvedRole]++;
            }
            else
            {
                employeeRoleCounts[resolvedRole] = 1;
            }
        }

        // Ensure Admin has at least 1 count (the main system administrator)
        var adminUsersCount = (await _userManager.GetUsersInRoleAsync("Admin")).Count;
        employeeRoleCounts["Admin"] = Math.Max(employeeRoleCounts["Admin"], Math.Max(adminUsersCount, 1));

        var result = allRoles.Select(r =>
        {
            var isSystem = defaultRoles.Any(d => string.Equals(d, r.Name, StringComparison.OrdinalIgnoreCase));
            int count = 0;

            if (employeeRoleCounts.TryGetValue(r.Name ?? "", out var resolvedCount))
            {
                count = resolvedCount;
            }
            else
            {
                // Custom Role: count direct designation matches
                count = employees.Count(e =>
                {
                    var des = e.Employment?.Designation?.Name ?? "";
                    return string.Equals(des, r.Name, StringComparison.OrdinalIgnoreCase);
                });
            }

            return new RoleResponseDto
            {
                Id = r.Id,
                Name = r.Name ?? "",
                IsSystem = isSystem,
                UserCount = count
            };
        })
        .Where(r => !string.Equals(r.Name, "Employee", StringComparison.OrdinalIgnoreCase))
        .OrderBy(r => r.IsSystem ? 0 : 1)
        .ThenBy(r => r.Name)
        .ToList();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<RoleResponseDto>> CreateRole([FromBody] CreateRoleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var trimmedName = dto.Name.Trim();

        if (await _roleManager.RoleExistsAsync(trimmedName))
        {
            return BadRequest(new { message = $"Role '{trimmedName}' already exists." });
        }

        var res = await _roleManager.CreateAsync(new IdentityRole(trimmedName));
        if (!res.Succeeded)
        {
            return BadRequest(new { message = string.Join(", ", res.Errors.Select(e => e.Description)) });
        }

        var created = await _roleManager.FindByNameAsync(trimmedName);
        return Ok(new RoleResponseDto
        {
            Id = created?.Id ?? Guid.NewGuid().ToString(),
            Name = trimmedName,
            IsSystem = false,
            UserCount = 0
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(string id)
    {
        var role = await _roleManager.FindByIdAsync(id);
        if (role == null)
        {
            return NotFound(new { message = "Role not found." });
        }

        string[] systemRoles = ["Admin", "HR", "Manager", "Staff"];
        if (systemRoles.Any(s => string.Equals(s, role.Name, StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { message = "Default system roles cannot be deleted." });
        }

        var res = await _roleManager.DeleteAsync(role);
        if (!res.Succeeded)
        {
            return BadRequest(new { message = string.Join(", ", res.Errors.Select(e => e.Description)) });
        }

        return Ok(new { message = $"Role '{role.Name}' deleted successfully." });
    }
}
