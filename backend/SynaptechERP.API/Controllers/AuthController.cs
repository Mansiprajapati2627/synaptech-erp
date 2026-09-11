// Controllers/AuthController.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var email = dto.Email.Trim().ToLower();

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var passwordOk = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordOk)
            return Unauthorized(new { message = "Invalid email or password." });

        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower();
        bool isAdmin = !string.IsNullOrEmpty(adminEmail) && email == adminEmail;

        // Look up the linked Employee row (admin has no employee row)
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == user.Id);

        return Ok(new
        {
            id = user.Id,
            name = employee?.Name ?? (isAdmin ? "Admin" : (user.Email ?? "User")),
            email = user.Email,
            role = isAdmin ? "Admin" : (employee?.Role ?? "Employee")
        });
    }
}