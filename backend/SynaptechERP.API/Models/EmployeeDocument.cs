// Models/EmployeeDocument.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynaptechERP.API.Models;

public class EmployeeDocument
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(150)]
    public string DocumentName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DocumentType { get; set; } = string.Empty; // e.g. Aadhaar, PAN, Passport, Resume, Offer Letter, Contract, Degree, Other

    [MaxLength(100)]
    public string? DocumentNumber { get; set; }

    [Required]
    public string FileUrl { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? FileName { get; set; }

    public long? FileSize { get; set; }

    [MaxLength(100)]
    public string? ContentType { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Active"; // Active, Pending, Verified, Rejected, Expired

    public DateTime? IssueDate { get; set; }

    public DateTime? ExpiryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation Property
    [ForeignKey(nameof(EmployeeId))]
    public Employee? Employee { get; set; }
}
