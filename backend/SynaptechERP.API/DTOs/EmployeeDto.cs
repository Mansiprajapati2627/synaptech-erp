// DTOs/EmployeeDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

// ============================
// Response DTO
// ============================
public class EmployeeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Department { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "Present";
    public int? ReportingManagerId { get; set; }
    public string? ReportingManagerName { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? UserId { get; set; }
}

// ============================
// Create DTO
// ============================
public class EmployeeCreateDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [Required]
    [MaxLength(100)]
    public string Role { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "Present";

    public int? ReportingManagerId { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
}

// ============================
// Update DTO
// ============================
public class EmployeeUpdateDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public string? Department { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "Present";
    public int? ReportingManagerId { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
}