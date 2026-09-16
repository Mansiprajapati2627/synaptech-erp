// DTOs/EmployeeDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

// ============================
// Response DTO
// ============================
public class EmployeeDto
{
    public int Id { get; set; }
    public string? EmployeeCode { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PersonalEmail { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Department { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "Present";
    public int? ReportingManagerId { get; set; }
    public string? ReportingManagerName { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UserId { get; set; }

    public EmployeeEmploymentDto? Employment { get; set; }
}

// ============================
// Create DTO
// ============================
public class EmployeeCreateDto
{
    public string? EmployeeCode { get; set; }

    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }

    public string? Name { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? PersonalEmail { get; set; }

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    public int? DepartmentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Role { get; set; } = string.Empty;

    public int? DesignationId { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Present";

    public int? EmploymentTypeId { get; set; }
    public int? EmploymentStatusId { get; set; }
    public int? ShiftId { get; set; }

    public int? ReportingManagerId { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
}

// ============================
// Update DTO
// ============================
public class EmployeeUpdateDto
{
    public string? EmployeeCode { get; set; }

    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }

    public string? Name { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? PersonalEmail { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Department { get; set; }
    public int? DepartmentId { get; set; }
    public string Role { get; set; } = string.Empty;
    public int? DesignationId { get; set; }
    public string Status { get; set; } = "Present";
    public int? EmploymentTypeId { get; set; }
    public int? EmploymentStatusId { get; set; }
    public int? ShiftId { get; set; }
    public string? Password { get; set; }
    public int? ReportingManagerId { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
}