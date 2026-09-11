// Models/Employee.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class Employee
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [MaxLength(100)]
    public string Role { get; set; } = "Employee";

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    // Link to ASP.NET Identity user
    public string? UserId { get; set; }

    // Employee's reporting manager
    public int? ReportingManagerId { get; set; }

    // Employee photo
    public string? PhotoUrl { get; set; }

    public DateTime? JoinDate { get; set; }

    public DateTime? BirthDate { get; set; }

    public DateTime CreatedAt { get; set; }

    // Reporting manager relationship
    public Employee? ReportingManager { get; set; }

    public ICollection<Employee>? Subordinates { get; set; }
}