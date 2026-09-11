// DTOs/DepartmentDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class DepartmentMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class DepartmentDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Lead { get; set; }
    public string Color { get; set; } = "teal";
    public int MemberCount { get; set; }
    public List<DepartmentMemberDto> Members { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateDepartmentDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Lead { get; set; }

    [MaxLength(30)]
    public string? Color { get; set; } = "teal";
}

public class UpdateDepartmentDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Lead { get; set; }

    [MaxLength(30)]
    public string? Color { get; set; }
}

public class AssignMemberDto
{
    [Required]
    public int EmployeeId { get; set; }
}
