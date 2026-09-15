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
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;

    public EmployeesController(AppDbContext context, UserManager<AppUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    public static string ResolveSystemRole(string? roleStr)
    {
        if (string.IsNullOrWhiteSpace(roleStr)) return "Employee";
        var r = roleStr.Trim();
        if (r.Contains("Admin", StringComparison.OrdinalIgnoreCase)) return "Admin";
        if (r.Contains("HR", StringComparison.OrdinalIgnoreCase)) return "HR";
        if (r.Contains("Manager", StringComparison.OrdinalIgnoreCase) || r.Contains("Lead", StringComparison.OrdinalIgnoreCase) || r.Contains("Director", StringComparison.OrdinalIgnoreCase)) return "Manager";
        return "Employee";
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
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.EmploymentStatus)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.EmploymentType)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.WorkLocation)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Shift)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.ReportingManager)
            .AsQueryable();

        if (!string.IsNullOrEmpty(adminEmail))
        {
            query = query.Where(e => e.Email.ToLower() != adminEmail);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(e =>
                e.FirstName.ToLower().Contains(s) ||
                (e.MiddleName != null && e.MiddleName.ToLower().Contains(s)) ||
                e.LastName.ToLower().Contains(s) ||
                e.Email.ToLower().Contains(s) ||
                (e.EmployeeCode != null && e.EmployeeCode.ToLower().Contains(s)));
        }

        var employees = await query
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .ToListAsync();

        var result = employees
            .Where(e => (e.Employment?.Designation?.Name ?? "Employee").ToLower() != "admin")
            .Select(ToDto)
            .ToList();

        return Ok(result);
    }

    // ================================
    // GET: /api/Employees/5
    // ================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployee(int id)
    {
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        var employee = await _context.Employees
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.EmploymentStatus)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.EmploymentType)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.WorkLocation)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Shift)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.ReportingManager)
            .FirstOrDefaultAsync(e => e.Id == id && (string.IsNullOrEmpty(adminEmail) || e.Email.ToLower() != adminEmail));

        if (employee == null) return NotFound();
        return Ok(ToDto(employee));
    }

    // ================================
    // POST: /api/Employees
    // Creates AspNetUsers login + Employees row + EmployeeEmployment row
    // ================================
    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] EmployeeCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var requestedRole = dto.Role?.Trim() ?? "Employee";
        if (requestedRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Admin role cannot be added to the employees directory. System administrators are managed separately." });
        }

        var (isValidDate, dateError) = ValidateEmployeeDates(dto.JoinDate, dto.BirthDate ?? dto.DateOfBirth);
        if (!isValidDate)
        {
            return BadRequest(new { message = dateError });
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();

        if (!string.IsNullOrEmpty(adminEmail) && normalizedEmail == adminEmail)
        {
            return BadRequest(new { message = "The admin account cannot be added as an employee." });
        }

        var employeeExists = await _context.Employees.AnyAsync(e => e.Email == normalizedEmail);
        if (employeeExists)
            return BadRequest(new { message = "An employee with this email already exists." });

        var appUser = await _userManager.FindByEmailAsync(normalizedEmail)
            ?? await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail);
        bool createdNewUser = false;

        if (appUser == null)
        {
            appUser = new AppUser
            {
                UserName = normalizedEmail,
                NormalizedUserName = normalizedEmail.ToUpperInvariant(),
                Email = normalizedEmail,
                NormalizedEmail = normalizedEmail.ToUpperInvariant(),
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
        else
        {
            appUser.NormalizedEmail = normalizedEmail.ToUpperInvariant();
            appUser.NormalizedUserName = normalizedEmail.ToUpperInvariant();
            await _userManager.UpdateAsync(appUser);

            await _userManager.RemovePasswordAsync(appUser);
            var resetRes = await _userManager.AddPasswordAsync(appUser, dto.Password);
            if (!resetRes.Succeeded)
            {
                var errors = string.Join(", ", resetRes.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Could not set password: {errors}" });
            }
        }

        var roleToAssign = ResolveSystemRole(requestedRole);
        if (!await _roleManager.RoleExistsAsync(roleToAssign))
        {
            await _roleManager.CreateAsync(new IdentityRole(roleToAssign));
        }
        var existingUserRoles = await _userManager.GetRolesAsync(appUser);
        if (existingUserRoles.Any())
        {
            await _userManager.RemoveFromRolesAsync(appUser, existingUserRoles);
        }
        await _userManager.AddToRoleAsync(appUser, roleToAssign);

        string? sanitizedPhone = null;
        if (!string.IsNullOrWhiteSpace(dto.Phone))
        {
            var digits = new string(dto.Phone.Where(char.IsDigit).ToArray());
            sanitizedPhone = digits.Length > 10 ? digits[..10] : digits;
        }

        // Parse Name into FirstName, MiddleName, LastName if not explicitly provided
        string firstName = dto.FirstName?.Trim() ?? string.Empty;
        string? middleName = dto.MiddleName?.Trim();
        string lastName = dto.LastName?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(dto.Name))
        {
            var parts = dto.Name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
            {
                firstName = parts[0];
            }
            else if (parts.Length == 2)
            {
                firstName = parts[0];
                lastName = parts[1];
            }
            else if (parts.Length > 2)
            {
                firstName = parts[0];
                middleName = parts[1];
                lastName = string.Join(" ", parts.Skip(2));
            }
        }

        if (string.IsNullOrWhiteSpace(firstName)) firstName = "Employee";

        // Lookup FK IDs for Master Tables if names provided
        int? deptId = dto.DepartmentId;
        if (!deptId.HasValue && !string.IsNullOrWhiteSpace(dto.Department))
        {
            var d = await _context.Departments.FirstOrDefaultAsync(x => x.Name.ToLower() == dto.Department.Trim().ToLower());
            deptId = d?.Id;
        }

        int? desigId = dto.DesignationId;
        if (!desigId.HasValue && !string.IsNullOrWhiteSpace(dto.Role))
        {
            var roleSearch = dto.Role.Trim().ToLower();
            var des = await _context.Designations.FirstOrDefaultAsync(x => x.Name.ToLower() == roleSearch)
                ?? await _context.Designations.FirstOrDefaultAsync(x => x.Name.ToLower().Contains(roleSearch))
                ?? await _context.Designations.FirstOrDefaultAsync(x => roleSearch.Contains(x.Name.ToLower()));

            if (des == null)
            {
                des = new Designation
                {
                    Name = dto.Role.Trim(),
                    Code = dto.Role.Trim().Replace(" ", "_").ToUpperInvariant(),
                    Description = $"{dto.Role.Trim()} Designation",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Designations.Add(des);
                await _context.SaveChangesAsync();
            }
            desigId = des.Id;
        }

        int? empStatusId = dto.EmploymentStatusId;
        if (!empStatusId.HasValue && !string.IsNullOrWhiteSpace(dto.Status))
        {
            var st = await _context.EmploymentStatuses.FirstOrDefaultAsync(x => x.Name.ToLower() == dto.Status.Trim().ToLower());
            empStatusId = st?.Id;
        }

        try
        {
            var employee = new Employee
            {
                EmployeeCode = dto.EmployeeCode?.Trim() ?? $"EMP{DateTime.UtcNow.Ticks.ToString()[^6..]}",
                FirstName = firstName,
                MiddleName = middleName,
                LastName = lastName,
                Email = normalizedEmail,
                PersonalEmail = dto.PersonalEmail?.Trim(),
                Phone = sanitizedPhone,
                AlternatePhone = dto.AlternatePhone?.Trim(),
                DateOfBirth = ToUtc(dto.DateOfBirth ?? dto.BirthDate),
                Gender = dto.Gender?.Trim(),
                PhotoUrl = dto.PhotoUrl,
                CreatedAt = DateTime.UtcNow,
                UserId = appUser.Id
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            var employment = new EmployeeEmployment
            {
                EmployeeId = employee.Id,
                DepartmentId = deptId,
                DesignationId = desigId,
                ReportingManagerId = dto.ReportingManagerId,
                EmploymentTypeId = dto.EmploymentTypeId,
                EmploymentStatusId = empStatusId,
                WorkLocationId = dto.WorkLocationId,
                ShiftId = dto.ShiftId,
                JoinDate = ToUtc(dto.JoinDate),
                CreatedAt = DateTime.UtcNow
            };

            _context.EmployeeEmployments.Add(employment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, ToDto(employee));
        }
        catch (Exception ex)
        {
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
        var requestedRole = dto.Role?.Trim() ?? "Employee";
        if (requestedRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Cannot set employee role to Admin. Admin accounts are managed separately." });
        }

        var (isValidUpdateDate, updateDateError) = ValidateEmployeeDates(dto.JoinDate, dto.BirthDate ?? dto.DateOfBirth);
        if (!isValidUpdateDate)
        {
            return BadRequest(new { message = updateDateError });
        }

        var employee = await _context.Employees
            .Include(e => e.Employment)
            .FirstOrDefaultAsync(e => e.Id == id);

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

        string? sanitizedPhone = null;
        if (!string.IsNullOrWhiteSpace(dto.Phone))
        {
            var digits = new string(dto.Phone.Where(char.IsDigit).ToArray());
            sanitizedPhone = digits.Length > 10 ? digits[..10] : digits;
        }

        string firstName = dto.FirstName?.Trim() ?? string.Empty;
        string? middleName = dto.MiddleName?.Trim();
        string lastName = dto.LastName?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(dto.Name))
        {
            var parts = dto.Name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
            {
                firstName = parts[0];
            }
            else if (parts.Length == 2)
            {
                firstName = parts[0];
                lastName = parts[1];
            }
            else if (parts.Length > 2)
            {
                firstName = parts[0];
                middleName = parts[1];
                lastName = string.Join(" ", parts.Skip(2));
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.EmployeeCode)) employee.EmployeeCode = dto.EmployeeCode.Trim();
        if (!string.IsNullOrWhiteSpace(firstName)) employee.FirstName = firstName;
        employee.MiddleName = string.IsNullOrWhiteSpace(middleName) ? null : middleName;
        if (!string.IsNullOrWhiteSpace(lastName)) employee.LastName = lastName;

        employee.Email = normalizedEmail;
        employee.PersonalEmail = dto.PersonalEmail?.Trim();
        employee.Phone = sanitizedPhone;
        employee.AlternatePhone = dto.AlternatePhone?.Trim();
        employee.DateOfBirth = ToUtc(dto.DateOfBirth ?? dto.BirthDate);
        employee.Gender = dto.Gender?.Trim();
        employee.PhotoUrl = dto.PhotoUrl;
        employee.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(employee.UserId))
        {
            var appUser = await _userManager.FindByIdAsync(employee.UserId);
            if (appUser != null)
            {
                appUser.Email = normalizedEmail;
                appUser.NormalizedEmail = normalizedEmail.ToUpperInvariant();
                appUser.UserName = normalizedEmail;
                appUser.NormalizedUserName = normalizedEmail.ToUpperInvariant();
                await _userManager.UpdateAsync(appUser);

                var roleToAssign = ResolveSystemRole(requestedRole);
                if (!await _roleManager.RoleExistsAsync(roleToAssign))
                {
                    await _roleManager.CreateAsync(new IdentityRole(roleToAssign));
                }
                var currentRoles = await _userManager.GetRolesAsync(appUser);
                if (currentRoles.Any())
                {
                    await _userManager.RemoveFromRolesAsync(appUser, currentRoles);
                }
                await _userManager.AddToRoleAsync(appUser, roleToAssign);

                if (!string.IsNullOrWhiteSpace(dto.Password))
                {
                    await _userManager.RemovePasswordAsync(appUser);
                    await _userManager.AddPasswordAsync(appUser, dto.Password.Trim());
                }
            }
        }

        // Update or create Employment record
        if (employee.Employment == null)
        {
            employee.Employment = new EmployeeEmployment
            {
                EmployeeId = employee.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.EmployeeEmployments.Add(employee.Employment);
        }

        if (dto.DepartmentId.HasValue) employee.Employment.DepartmentId = dto.DepartmentId;
        else if (!string.IsNullOrWhiteSpace(dto.Department))
        {
            var d = await _context.Departments.FirstOrDefaultAsync(x => x.Name.ToLower() == dto.Department.Trim().ToLower());
            if (d != null) employee.Employment.DepartmentId = d.Id;
        }

        if (dto.DesignationId.HasValue) employee.Employment.DesignationId = dto.DesignationId;
        else if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            var roleSearch = dto.Role.Trim().ToLower();
            var des = await _context.Designations.FirstOrDefaultAsync(x => x.Name.ToLower() == roleSearch)
                ?? await _context.Designations.FirstOrDefaultAsync(x => x.Name.ToLower().Contains(roleSearch))
                ?? await _context.Designations.FirstOrDefaultAsync(x => roleSearch.Contains(x.Name.ToLower()));

            if (des == null)
            {
                des = new Designation
                {
                    Name = dto.Role.Trim(),
                    Code = dto.Role.Trim().Replace(" ", "_").ToUpperInvariant(),
                    Description = $"{dto.Role.Trim()} Designation",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Designations.Add(des);
                await _context.SaveChangesAsync();
            }
            employee.Employment.DesignationId = des.Id;
        }

        if (dto.EmploymentStatusId.HasValue) employee.Employment.EmploymentStatusId = dto.EmploymentStatusId;
        else if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            var st = await _context.EmploymentStatuses.FirstOrDefaultAsync(x => x.Name.ToLower() == dto.Status.Trim().ToLower());
            if (st != null) employee.Employment.EmploymentStatusId = st.Id;
        }

        if (dto.EmploymentTypeId.HasValue) employee.Employment.EmploymentTypeId = dto.EmploymentTypeId;
        if (dto.WorkLocationId.HasValue) employee.Employment.WorkLocationId = dto.WorkLocationId;
        if (dto.ShiftId.HasValue) employee.Employment.ShiftId = dto.ShiftId;
        if (dto.ReportingManagerId.HasValue) employee.Employment.ReportingManagerId = dto.ReportingManagerId;
        if (dto.JoinDate.HasValue) employee.Employment.JoinDate = ToUtc(dto.JoinDate);
        employee.Employment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

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
    private EmployeeDto ToDto(Employee e)
    {
        var emp = e.Employment ?? _context.EmployeeEmployments
            .Include(ee => ee.Department)
            .Include(ee => ee.Designation)
            .Include(ee => ee.EmploymentType)
            .Include(ee => ee.EmploymentStatus)
            .Include(ee => ee.WorkLocation)
            .Include(ee => ee.Shift)
            .FirstOrDefault(ee => ee.EmployeeId == e.Id);
        var cleanLastName = string.Equals(e.LastName?.Trim(), "User", StringComparison.OrdinalIgnoreCase) ? string.Empty : (e.LastName?.Trim() ?? string.Empty);
        var cleanFirstName = string.IsNullOrWhiteSpace(e.FirstName) ? e.Email.Split('@')[0] : e.FirstName.Trim();
        var displayName = e.Name;
        if (string.IsNullOrWhiteSpace(displayName) || (displayName.Trim().ToLower().EndsWith(" user") && displayName.Trim().ToLower() != "user"))
        {
            var parts = new[] { cleanFirstName, e.MiddleName?.Trim(), cleanLastName }.Where(s => !string.IsNullOrWhiteSpace(s));
            displayName = string.Join(" ", parts).Trim();
        }
        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = cleanFirstName;
        }

        return new EmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
            FirstName = cleanFirstName,
            MiddleName = e.MiddleName,
            LastName = cleanLastName,
            Name = displayName,
            Email = e.Email,

            PersonalEmail = e.PersonalEmail,
            Phone = e.Phone,
            AlternatePhone = e.AlternatePhone,
            Department = emp?.Department?.Name,
            Role = emp?.Designation?.Name ?? "Employee",
            Status = emp?.EmploymentStatus?.Name ?? "Active",
            ReportingManagerId = emp?.ReportingManagerId,
            ReportingManagerName = emp?.ReportingManager?.Name,
            PhotoUrl = e.PhotoUrl,
            DateOfBirth = e.DateOfBirth,
            Gender = e.Gender,
            JoinDate = emp?.JoinDate,
            BirthDate = e.DateOfBirth,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
            UserId = e.UserId,
            Employment = emp == null ? null : new EmployeeEmploymentDto
            {
                Id = emp.Id,
                EmployeeId = emp.EmployeeId,
                DepartmentId = emp.DepartmentId,
                DepartmentName = emp.Department?.Name,
                DesignationId = emp.DesignationId,
                DesignationName = emp.Designation?.Name,
                ReportingManagerId = emp.ReportingManagerId,
                ReportingManagerName = emp.ReportingManager?.Name,
                EmploymentTypeId = emp.EmploymentTypeId,
                EmploymentTypeName = emp.EmploymentType?.Name,
                EmploymentStatusId = emp.EmploymentStatusId,
                EmploymentStatusName = emp.EmploymentStatus?.Name,
                WorkLocationId = emp.WorkLocationId,
                WorkLocationName = emp.WorkLocation?.Name,
                ShiftId = emp.ShiftId,
                ShiftName = emp.Shift?.Name,
                JoinDate = emp.JoinDate,
                ConfirmationDate = emp.ConfirmationDate,
                ProbationStartDate = emp.ProbationStartDate,
                ProbationEndDate = emp.ProbationEndDate,
                NoticePeriodDays = emp.NoticePeriodDays,
                WorkMode = emp.WorkMode,
                CreatedAt = emp.CreatedAt,
                UpdatedAt = emp.UpdatedAt
            }
        };
    }

    private static (bool IsValid, string? ErrorMessage) ValidateEmployeeDates(DateTime? joinDate, DateTime? birthDate)
    {
        var minJoinDate = new DateTime(2025, 1, 1);
        var today = DateTime.Today;

        if (joinDate.HasValue)
        {
            var j = joinDate.Value.Date;
            if (j < minJoinDate)
            {
                return (false, "Joining date cannot be before 2025.");
            }
            if (j > today)
            {
                return (false, "Joining date cannot be in the future (after today).");
            }
        }

        if (birthDate.HasValue)
        {
            var b = birthDate.Value.Date;
            var minBirth = new DateTime(1955, 1, 1);
            var maxBirth = today.AddYears(-18);

            if (b < minBirth)
            {
                return (false, "Birthdate is not realistic (must be after 1955).");
            }
            if (b > maxBirth)
            {
                return (false, "Birthdate is invalid. Employee must be at least 18 years old.");
            }
        }

        return (true, null);
    }

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