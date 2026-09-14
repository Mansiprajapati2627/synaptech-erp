// Controllers/AuthController.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<AppUser> userManager, AppDbContext context, IConfiguration configuration)
    {
        _userManager = userManager;
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

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var passwordOk = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordOk)
            return Unauthorized(new { message = "Invalid email or password." });

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = !string.IsNullOrEmpty(adminEmail) && email == adminEmail;

        // Fetch user roles
        var userRoles = await _userManager.GetRolesAsync(user);

        // Fetch linked Employee row
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == user.Id || e.Email == email);

        string primaryRole = isAdmin ? "Admin" :
            userRoles.FirstOrDefault(r => new[] { "Admin", "HR", "Manager", "Employee" }.Contains(r)) ??
            employee?.Role ?? "Employee";

        // Generate JWT Token
        var token = GenerateJwtToken(user, primaryRole, employee?.Name, employee?.Id);

        return Ok(new
        {
            token,
            tokenType = "Bearer",
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
            .FirstOrDefaultAsync(e => e.UserId == user.Id || e.Email == user.Email);

        string primaryRole = isAdmin ? "Admin" :
            userRoles.FirstOrDefault(r => new[] { "Admin", "HR", "Manager", "Employee" }.Contains(r)) ??
            employee?.Role ?? "Employee";

        return Ok(new
        {
            id = user.Id,
            name = employee?.Name ?? (isAdmin ? "Admin System" : (user.Email ?? "User")),
            email = user.Email,
            role = primaryRole,
            employeeId = employee?.Id
        });
    }

    // Helper: JWT Token Generator
    private string GenerateJwtToken(AppUser user, string role, string? displayName, int? employeeId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? "SynaptechERPSecretKey_2026_MustBeAtLeast32BytesLongSecret!";
        var issuer = jwtSettings["Issuer"] ?? "SynaptechERP.API";
        var audience = jwtSettings["Audience"] ?? "SynaptechERP.Client";
        var expiryMinutes = double.TryParse(jwtSettings["ExpiryInMinutes"], out double exp) ? exp : 1440;

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
}