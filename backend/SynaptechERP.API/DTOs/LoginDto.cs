// DTOs/LoginDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}