// DTOs/EmployeeDocumentDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class EmployeeDocumentDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public string DocumentName { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string? DocumentNumber { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? ContentType { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class EmployeeDocumentCreateDto
{
    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(150)]
    public string DocumentName { get; set; } = string.Empty;


    [Required]
    [MaxLength(100)]
    public string DocumentType { get; set; } = string.Empty;

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
    public string Status { get; set; } = "Active";

    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class EmployeeDocumentUpdateDto
{
    [Required]
    [MaxLength(150)]
    public string DocumentName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DocumentType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? DocumentNumber { get; set; }

    public string? FileUrl { get; set; }

    [MaxLength(255)]
    public string? FileName { get; set; }

    public long? FileSize { get; set; }

    [MaxLength(100)]
    public string? ContentType { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Active";

    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
