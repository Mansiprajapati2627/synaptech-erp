// Models/Employee.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynaptechERP.API.Models;

public class Employee
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string? EmployeeCode { get; set; }

    // Link to ASP.NET Identity user
    public string? UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? MiddleName { get; set; }

    [Required]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [EmailAddress]
    [MaxLength(150)]
    public string? PersonalEmail { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(20)]
    public string? AlternatePhone { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    public string? PhotoUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation property to EmployeeEmployment
    public EmployeeEmployment? Employment { get; set; }

    // Navigation property to EmployeeDocuments
    public ICollection<EmployeeDocument> Documents { get; set; } = new List<EmployeeDocument>();


    // Backward-compatible helper properties
    [NotMapped]
    public string Name
    {
        get
        {
            var last = string.Equals(LastName?.Trim(), "User", StringComparison.OrdinalIgnoreCase) ? string.Empty : (LastName?.Trim() ?? string.Empty);
            var middle = MiddleName?.Trim() ?? string.Empty;
            var first = FirstName?.Trim() ?? string.Empty;

            var parts = new[] { first, middle, last }.Where(s => !string.IsNullOrWhiteSpace(s));
            var full = string.Join(" ", parts).Trim();
            return string.IsNullOrWhiteSpace(full) ? Email.Split('@')[0] : full;
        }
        set
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            var parts = value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
            {
                FirstName = parts[0];
                LastName = string.Empty;
            }
            else if (parts.Length == 2)
            {
                FirstName = parts[0];
                LastName = string.Equals(parts[1], "User", StringComparison.OrdinalIgnoreCase) ? string.Empty : parts[1];
            }
            else
            {
                FirstName = parts[0];
                MiddleName = parts[1];
                var lastPart = string.Join(" ", parts.Skip(2));
                LastName = string.Equals(lastPart, "User", StringComparison.OrdinalIgnoreCase) ? string.Empty : lastPart;
            }
        }
    }


    [NotMapped]
    public string Role
    {
        get => Employment?.Designation?.Name ?? "Employee";
        set { /* Backward compatibility setter */ }
    }

    [NotMapped]
    public string Status
    {
        get => Employment?.EmploymentStatus?.Name ?? "Active";
        set { /* Backward compatibility setter */ }
    }

    [NotMapped]
    public string? Department
    {
        get => Employment?.Department?.Name;
        set { /* Backward compatibility setter */ }
    }

    [NotMapped]
    public DateTime? JoinDate
    {
        get => Employment?.JoinDate;
        set
        {
            if (Employment != null) Employment.JoinDate = value;
        }
    }

    [NotMapped]
    public DateTime? BirthDate
    {
        get => DateOfBirth;
        set => DateOfBirth = value;
    }

    [NotMapped]
    public int? ReportingManagerId
    {
        get => Employment?.ReportingManagerId;
        set
        {
            if (Employment != null) Employment.ReportingManagerId = value;
        }
    }
}