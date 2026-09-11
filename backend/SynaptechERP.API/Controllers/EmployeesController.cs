// Controllers/EmployeesController.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.Models;
using SynaptechERP.API.DTOs;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<AppUser> _userManager;
    private readonly IConfiguration _configuration;

    public EmployeesController(AppDbContext context, UserManager<AppUser> userManager, IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _configuration = configuration;
    }

    // ================================
    // GET: /api/Employees?search=
    // Employees table must not return any admin
    // ================================
    [HttpGet]
    public async Task<IActionResult> GetEmployees([FromQuery] string? search = null)
    {
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        var query = _context.Employees
            .Include(e => e.ReportingManager)
            .Where(e => e.Role.ToLower() != "admin")
            .AsQueryable();

        if (!string.IsNullOrEmpty(adminEmail))
        {
            query = query.Where(e => e.Email.ToLower() != adminEmail);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(e =>
                e.Name.ToLower().Contains(s) ||
                e.Email.ToLower().Contains(s) ||
                e.Role.ToLower().Contains(s));
        }

        var employees = await query
            .OrderBy(e => e.Name)
            .Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                Phone = e.Phone,
                Department = e.Department,
                Role = e.Role,
                Status = e.Status,
                ReportingManagerId = e.ReportingManagerId,
                ReportingManagerName = e.ReportingManager != null ? e.ReportingManager.Name : null,
                PhotoUrl = e.PhotoUrl,
                JoinDate = e.JoinDate,
                BirthDate = e.BirthDate,
                CreatedAt = e.CreatedAt,
                UserId = e.UserId
            })
            .ToListAsync();

        return Ok(employees);
    }

    // ================================
    // GET: /api/Employees/5
    // ================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployee(int id)
    {
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        var employee = await _context.Employees
            .Include(e => e.ReportingManager)
            .Where(e => e.Id == id && e.Role.ToLower() != "admin" && (string.IsNullOrEmpty(adminEmail) || e.Email.ToLower() != adminEmail))
            .Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                Phone = e.Phone,
                Department = e.Department,
                Role = e.Role,
                Status = e.Status,
                ReportingManagerId = e.ReportingManagerId,
                ReportingManagerName = e.ReportingManager != null ? e.ReportingManager.Name : null,
                PhotoUrl = e.PhotoUrl,
                JoinDate = e.JoinDate,
                BirthDate = e.BirthDate,
                CreatedAt = e.CreatedAt,
                UserId = e.UserId
            })
            .FirstOrDefaultAsync();

        if (employee == null) return NotFound();
        return Ok(employee);
    }

    // ================================
    // POST: /api/Employees
    // Creates AspNetUsers login + Employees row (linked via UserId).
    // Employees table should not have any admin.
    // Gracefully links if AspNetUsers record already exists.
    // ================================
    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] EmployeeCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Disallow Admin role in employees table
        if (dto.Role.Trim().Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Admin role cannot be added to the employees directory. System administrators are managed separately." });
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        if (!string.IsNullOrEmpty(adminEmail) && normalizedEmail == adminEmail)
        {
            return BadRequest(new { message = "The admin account cannot be added as an employee." });
        }

        // 1. Duplicate check in Employees table
        var employeeExists = await _context.Employees.AnyAsync(e => e.Email == normalizedEmail);
        if (employeeExists)
            return BadRequest(new { message = "An employee with this email already exists." });

        // 2. Check if Identity user already exists or needs to be created
        var appUser = await _userManager.FindByEmailAsync(normalizedEmail);
        bool createdNewUser = false;

        if (appUser == null)
        {
            appUser = new AppUser
            {
                UserName = normalizedEmail,
                Email = normalizedEmail,
                EmailConfirmed = true
            };

            var identityResult = await _userManager.CreateAsync(appUser, dto.Password);
            if (!identityResult.Succeeded)
            {
                var errors = string.Join(", ", identityResult.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Could not create login: {errors}" });
            }
            createdNewUser = true;
        }

        // 3. Create Employee row in Employees table
        try
        {
            var employee = new Employee
            {
                Name = dto.Name.Trim(),
                Email = normalizedEmail,
                Phone = dto.Phone,
                Department = dto.Department,
                Role = dto.Role,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Present" : dto.Status,
                ReportingManagerId = dto.ReportingManagerId,
                PhotoUrl = dto.PhotoUrl,
                JoinDate = ToUtc(dto.JoinDate),
                BirthDate = ToUtc(dto.BirthDate),
                CreatedAt = DateTime.UtcNow,
                UserId = appUser.Id
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, ToDto(employee));
        }
        catch (Exception ex)
        {
            // Rollback only if this request created the user
            if (createdNewUser)
            {
                await _userManager.DeleteAsync(appUser);
            }

            var detail = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = "Failed to save employee.", detail });
        }
    }

    // ================================
    // PUT: /api/Employees/5
    // ================================
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] EmployeeUpdateDto dto)
    {
        if (dto.Role.Trim().Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Cannot set employee role to Admin. Admin accounts are managed separately." });
        }

        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return NotFound();

        var normalizedEmail = dto.Email.Trim().ToLower();
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        if (!string.IsNullOrEmpty(adminEmail) && normalizedEmail == adminEmail)
        {
            return BadRequest(new { message = "Cannot use admin email for an employee." });
        }

        var exists = await _context.Employees
            .AnyAsync(e => e.Email == normalizedEmail && e.Id != id);
        if (exists)
            return BadRequest(new { message = "Another employee uses this email." });

        employee.Name = dto.Name.Trim();
        employee.Email = normalizedEmail;
        employee.Phone = dto.Phone;
        employee.Department = dto.Department;
        employee.Role = dto.Role;
        employee.Status = dto.Status;
        employee.ReportingManagerId = dto.ReportingManagerId;
        employee.PhotoUrl = dto.PhotoUrl;
        employee.JoinDate = ToUtc(dto.JoinDate);
        employee.BirthDate = ToUtc(dto.BirthDate);

        await _context.SaveChangesAsync();

        // Keep linked login in sync
        if (!string.IsNullOrEmpty(employee.UserId))
        {
            var linkedUser = await _userManager.FindByIdAsync(employee.UserId);
            if (linkedUser != null && linkedUser.Email != employee.Email)
            {
                linkedUser.Email = employee.Email;
                linkedUser.UserName = employee.Email;
                await _userManager.UpdateAsync(linkedUser);
            }
        }

        return NoContent();
    }

    // ================================
    // DELETE: /api/Employees/5
    // Also removes the linked AspNetUsers login.
    // ================================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return NotFound();

        var linkedUserId = employee.UserId;

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(linkedUserId))
        {
            var linkedUser = await _userManager.FindByIdAsync(linkedUserId);
            if (linkedUser != null)
            {
                await _userManager.DeleteAsync(linkedUser);
            }
        }

        return NoContent();
    }

    // ================================
    // Helper: Model → DTO
    // ================================
    private static EmployeeDto ToDto(Employee e)
    {
        return new EmployeeDto
        {
            Id = e.Id,
            Name = e.Name,
            Email = e.Email,
            Phone = e.Phone,
            Department = e.Department,
            Role = e.Role,
            Status = e.Status,
            ReportingManagerId = e.ReportingManagerId,
            ReportingManagerName = e.ReportingManager?.Name,
            PhotoUrl = e.PhotoUrl,
            JoinDate = e.JoinDate,
            BirthDate = e.BirthDate,
            CreatedAt = e.CreatedAt,
            UserId = e.UserId
        };
    }

    // ================================
    // Helper: Normalize DateTime to UTC
    // PostgreSQL's "timestamp with time zone" only accepts Utc kind.
    // Frontend sends "2025-01-15" → .NET produces Kind=Unspecified → error.
    // This fixes it.
    // ================================
    private static DateTime? ToUtc(DateTime? dt)
    {
        if (dt == null) return null;

        if (dt.Value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc);

        if (dt.Value.Kind == DateTimeKind.Local)
            return dt.Value.ToUniversalTime();

        return dt.Value;
    }
}