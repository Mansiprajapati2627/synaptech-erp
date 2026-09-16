// Controllers/AuthController.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<AppUser> userManager, RoleManager<IdentityRole> roleManager, AppDbContext context, IConfiguration configuration)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _context = context;
        _configuration = configuration;
    }

    // ==========================================
    // POST: /api/Auth/login
    // ==========================================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Email and password are required." });

        var email = dto.Email.Trim().ToLower();
        var rawPassword = dto.Password;
        var trimmedPassword = dto.Password.Trim();

        var user = await _userManager.FindByEmailAsync(email)
            ?? await _userManager.FindByNameAsync(email)
            ?? await _context.Users.FirstOrDefaultAsync(u => (u.Email != null && u.Email.ToLower() == email) || (u.UserName != null && u.UserName.ToLower() == email));

        if (user == null)
        {
            var empMatch = await _context.Employees.FirstOrDefaultAsync(e => e.Email != null && e.Email.ToLower() == email);
            if (empMatch != null && !string.IsNullOrEmpty(empMatch.UserId))
            {
                user = await _userManager.FindByIdAsync(empMatch.UserId);
                if (user != null)
                {
                    user.Email = email;
                    user.NormalizedEmail = email.ToUpperInvariant();
                    user.UserName = email;
                    user.NormalizedUserName = email.ToUpperInvariant();
                    await _userManager.UpdateAsync(user);
                }
            }

            if (user == null && empMatch != null && !string.IsNullOrWhiteSpace(rawPassword) && rawPassword.Length >= 3)
            {
                user = new AppUser
                {
                    UserName = empMatch.Email.ToLower(),
                    NormalizedUserName = empMatch.Email.ToUpperInvariant(),
                    Email = empMatch.Email.ToLower(),
                    NormalizedEmail = empMatch.Email.ToUpperInvariant(),
                    EmailConfirmed = true
                };
                var createRes = await _userManager.CreateAsync(user, rawPassword);
                if (createRes.Succeeded)
                {
                    var validRoles = new[] { "Admin", "HR", "Manager", "Employee" };
                    var roleToAssign = validRoles.Contains(empMatch.Role) ? empMatch.Role : "Employee";
                    await _userManager.AddToRoleAsync(user, roleToAssign);
                    empMatch.UserId = user.Id;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return Unauthorized(new { message = "Invalid email or password." });
                }
            }
            else if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }
        }

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = !string.IsNullOrEmpty(adminEmail) && email == adminEmail;

        var passwordOk = await _userManager.CheckPasswordAsync(user, rawPassword);
        if (!passwordOk && rawPassword != trimmedPassword)
        {
            passwordOk = await _userManager.CheckPasswordAsync(user, trimmedPassword);
        }

        if (!passwordOk)
            return Unauthorized(new { message = "Invalid email or password. Please verify your login credentials or ask Admin to reset your password." });

        // Fetch user roles
        var userRoles = await _userManager.GetRolesAsync(user);

        // Fetch linked Employee row
        var employee = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee.Designation)
            .FirstOrDefaultAsync(e => e.UserId == user.Id || e.Email == email);

        if (employee != null && string.IsNullOrEmpty(employee.UserId))
        {
            employee.UserId = user.Id;
            await _context.SaveChangesAsync();
        }

        string? desRole = employee != null ? EmployeesController.ResolveSystemRole(employee.Employment?.Designation?.Name ?? employee.Role) : null;
        string[] highRoles = new[] { "Admin", "HR", "Manager" };

        string primaryRole;
        if (isAdmin)
        {
            primaryRole = "Admin";
        }
        else
        {
            var matchedUserRole = highRoles.FirstOrDefault(r => userRoles.Contains(r));
            if (matchedUserRole != null)
            {
                primaryRole = matchedUserRole;
            }
            else if (!string.IsNullOrEmpty(desRole) && desRole != "Employee")
            {
                primaryRole = desRole;
            }
            else if (userRoles.Contains("Employee"))
            {
                primaryRole = "Employee";
            }
            else
            {
                primaryRole = desRole ?? "Employee";
            }
        }

        if (!userRoles.Contains(primaryRole))
        {
            if (!await _roleManager.RoleExistsAsync(primaryRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(primaryRole));
            }
            await _userManager.AddToRoleAsync(user, primaryRole);
        }

        // Generate JWT Token & Refresh Token
        var token = GenerateJwtToken(user, primaryRole, employee?.Name, employee?.Id);
        var refreshToken = GenerateRefreshToken();

        var refreshExpiryDays = double.TryParse(_configuration["JwtSettings:RefreshTokenExpiryInDays"], out double days) ? days : 7;
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _userManager.UpdateAsync(user);

        var expiryMinutes = double.TryParse(_configuration["JwtSettings:ExpiryInMinutes"], out double expMins) ? expMins : 15;

        return Ok(new
        {
            token,
            refreshToken,
            tokenType = "Bearer",
            expiresIn = (int)(expiryMinutes * 60),
            id = user.Id,
            name = employee?.Name ?? (isAdmin ? "Admin System" : (user.Email ?? "User")),
            email = user.Email,
            role = primaryRole,
            employeeId = employee?.Id
        });
    }

    // ==========================================
    // GET: /api/Auth/me (Requires JWT Auth)
    // ==========================================
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(email))
            return Unauthorized(new { message = "User identity not found in token." });

        AppUser? user = null;
        if (!string.IsNullOrEmpty(userId))
        {
            user = await _userManager.FindByIdAsync(userId);
        }
        if (user == null && !string.IsNullOrEmpty(email))
        {
            user = await _userManager.FindByEmailAsync(email);
        }

        if (user == null)
            return NotFound(new { message = "User profile not found." });

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = !string.IsNullOrEmpty(adminEmail) && user.Email?.Trim().ToLower() == adminEmail;

        var userRoles = await _userManager.GetRolesAsync(user);
        var employee = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee.Designation)
            .FirstOrDefaultAsync(e => e.UserId == user.Id || e.Email == user.Email);

        string? desRole = employee != null ? EmployeesController.ResolveSystemRole(employee.Employment?.Designation?.Name ?? employee.Role) : null;
        string[] rolePriority = new[] { "Admin", "HR", "Manager", "Employee" };

        string primaryRole = isAdmin ? "Admin" :
            rolePriority.FirstOrDefault(r => userRoles.Contains(r)) ??
            (desRole != "Employee" ? desRole : null) ??
            "Employee";

        return Ok(new
        {
            id = user.Id,
            name = employee?.Name ?? (isAdmin ? "Admin System" : (user.Email ?? "User")),
            email = user.Email,
            role = primaryRole,
            employeeId = employee?.Id
        });
    }

    // ==========================================
    // POST: /api/Auth/reset-password (Admin only)
    // ==========================================
    [HttpPost("reset-password")]
    [Authorize]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (dto.EmployeeId <= 0 || string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            return BadRequest(new { message = "Employee ID and new password are required." });
        }

        if (dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters long." });
        }

        // Verify caller is Admin
        var callerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerEmail = User.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = callerRole == "Admin" || (!string.IsNullOrEmpty(adminEmail) && callerEmail == adminEmail);

        if (!isAdmin && !string.IsNullOrEmpty(callerUserId))
        {
            var callerUser = await _userManager.FindByIdAsync(callerUserId);
            if (callerUser != null)
            {
                var roles = await _userManager.GetRolesAsync(callerUser);
                isAdmin = roles.Contains("Admin");
            }
        }

        if (!isAdmin)
        {
            return Forbid();
        }

        // Fetch employee
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.EmployeeId);
        if (employee == null)
        {
            return NotFound(new { message = "Employee not found." });
        }

        var empEmail = employee.Email.Trim().ToLower();

        AppUser? user = null;
        if (!string.IsNullOrEmpty(employee.UserId))
        {
            user = await _userManager.FindByIdAsync(employee.UserId);
        }

        if (user == null)
        {
            user = await _userManager.FindByEmailAsync(empEmail)
                ?? await _userManager.FindByNameAsync(empEmail)
                ?? await _context.Users.FirstOrDefaultAsync(u => (u.Email != null && u.Email.ToLower() == empEmail) || (u.UserName != null && u.UserName.ToLower() == empEmail));
        }

        var newPassword = dto.NewPassword.Trim();

        if (user == null)
        {
            // Create user with new password
            user = new AppUser
            {
                UserName = empEmail,
                NormalizedUserName = empEmail.ToUpperInvariant(),
                Email = empEmail,
                NormalizedEmail = empEmail.ToUpperInvariant(),
                EmailConfirmed = true
            };
            var createResult = await _userManager.CreateAsync(user, newPassword);
            if (!createResult.Succeeded)
            {
                var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to create user account with new password: {errors}" });
            }

            var validRoles = new[] { "Admin", "HR", "Manager", "Employee" };
            var roleToAssign = validRoles.Contains(employee.Role) ? employee.Role : "Employee";
            await _userManager.AddToRoleAsync(user, roleToAssign);

            employee.UserId = user.Id;
            await _context.SaveChangesAsync();
        }
        else
        {
            // Ensure email, username and normalized properties match employee's email
            user.Email = empEmail;
            user.NormalizedEmail = empEmail.ToUpperInvariant();
            user.UserName = empEmail;
            user.NormalizedUserName = empEmail.ToUpperInvariant();
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            // Remove existing password hash if present
            if (await _userManager.HasPasswordAsync(user))
            {
                var removeResult = await _userManager.RemovePasswordAsync(user);
                if (!removeResult.Succeeded)
                {
                    var removeErrors = string.Join("; ", removeResult.Errors.Select(e => e.Description));
                    return BadRequest(new { message = $"Failed to reset existing password: {removeErrors}" });
                }
            }

            var addResult = await _userManager.AddPasswordAsync(user, newPassword);
            if (!addResult.Succeeded)
            {
                var addErrors = string.Join("; ", addResult.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to set new password: {addErrors}" });
            }

            await _userManager.UpdateSecurityStampAsync(user);

            if (employee.UserId != user.Id)
            {
                employee.UserId = user.Id;
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new { message = $"Password successfully reset for employee {employee.Name}." });
    }

    // ==========================================
    // POST: /api/Auth/refresh-token
    // Exchange an expired/valid access token + refresh token for a new pair
    // ==========================================
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.RefreshToken) || string.IsNullOrWhiteSpace(dto.AccessToken))
        {
            return BadRequest(new { message = "AccessToken and RefreshToken are required." });
        }

        ClaimsPrincipal? principal;
        try
        {
            principal = GetPrincipalFromExpiredToken(dto.AccessToken);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Invalid access token: {ex.Message}" });
        }

        if (principal == null)
        {
            return BadRequest(new { message = "Invalid access token claims." });
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = principal.FindFirst(ClaimTypes.Email)?.Value;

        AppUser? user = null;
        if (!string.IsNullOrEmpty(userId))
        {
            user = await _userManager.FindByIdAsync(userId);
        }
        if (user == null && !string.IsNullOrEmpty(email))
        {
            user = await _userManager.FindByEmailAsync(email);
        }

        if (user == null || user.RefreshToken != dto.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token. Please login again." });
        }

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = !string.IsNullOrEmpty(adminEmail) && user.Email?.Trim().ToLower() == adminEmail;

        var userRoles = await _userManager.GetRolesAsync(user);
        var employee = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee.Designation)
            .FirstOrDefaultAsync(e => e.UserId == user.Id || e.Email == user.Email);

        string? desRole = employee != null ? EmployeesController.ResolveSystemRole(employee.Employment?.Designation?.Name ?? employee.Role) : null;
        string[] rolePriority = new[] { "Admin", "HR", "Manager", "Employee" };

        string primaryRole = isAdmin ? "Admin" :
            rolePriority.FirstOrDefault(r => userRoles.Contains(r)) ??
            (desRole != "Employee" ? desRole : null) ??
            "Employee";

        // Generate new Access Token & new Refresh Token (Token Rotation)
        var newAccessToken = GenerateJwtToken(user, primaryRole, employee?.Name, employee?.Id);
        var newRefreshToken = GenerateRefreshToken();

        var refreshExpiryDays = double.TryParse(_configuration["JwtSettings:RefreshTokenExpiryInDays"], out double days) ? days : 7;
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _userManager.UpdateAsync(user);

        var expiryMinutes = double.TryParse(_configuration["JwtSettings:ExpiryInMinutes"], out double expMins) ? expMins : 15;

        return Ok(new
        {
            token = newAccessToken,
            refreshToken = newRefreshToken,
            tokenType = "Bearer",
            expiresIn = (int)(expiryMinutes * 60)
        });
    }

    // ==========================================
    // POST: /api/Auth/revoke-token
    // Revoke current user's refresh token on logout
    // ==========================================
    [HttpPost("revoke-token")]
    [Authorize]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequestDto? dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        AppUser? user = null;
        if (!string.IsNullOrEmpty(userId))
        {
            user = await _userManager.FindByIdAsync(userId);
        }
        if (user == null && !string.IsNullOrEmpty(email))
        {
            user = await _userManager.FindByEmailAsync(email);
        }

        if (user == null && dto != null && !string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == dto.RefreshToken);
        }

        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userManager.UpdateAsync(user);
        }

        return Ok(new { message = "Refresh token successfully revoked." });
    }

    // Helper: JWT Token Generator
    private string GenerateJwtToken(AppUser user, string role, string? displayName, int? employeeId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? "SynaptechERPSecretKey_2026_MustBeAtLeast32BytesLongSecret!";
        var issuer = jwtSettings["Issuer"] ?? "SynaptechERP.API";
        var audience = jwtSettings["Audience"] ?? "SynaptechERP.Client";
        var expiryMinutes = double.TryParse(jwtSettings["ExpiryInMinutes"], out double exp) ? exp : 15;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? ""),
            new(ClaimTypes.Name, displayName ?? user.Email ?? "User"),
            new(ClaimTypes.Role, role),
            new("EmployeeId", employeeId?.ToString() ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Helper: Refresh Token Generator (Secure random 256-bit string)
    private static string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    // Helper: Extract Principal Claims from Expired JWT
    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? "SynaptechERPSecretKey_2026_MustBeAtLeast32BytesLongSecret!";

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateLifetime = false // Don't check expiration here so we can read expired tokens
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

        if (securityToken is not JwtSecurityToken jwtSecurityToken ||
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new SecurityTokenException("Invalid token format or algorithm.");
        }

        return principal;
    }
}