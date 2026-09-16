// Models/PayrollRecord.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynaptechERP.API.Models;

public class PayrollRecord
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }

    [Required]
    public string EmployeeName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal BaseSalary { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Allowances { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Deductions { get; set; }

    public int DaysInMonth { get; set; }

    public int PresentDays { get; set; }

    public int ApprovedLeaveDays { get; set; }

    public int PayableDays { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal EarnedBaseSalary { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal EarnedAllowances { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal NetSalary { get; set; }

    [Required]
    [MaxLength(10)]
    public string Month { get; set; } = string.Empty; // Format: YYYY-MM (e.g. "2026-09")

    public int Year { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // "Pending", "Processed", "Paid"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
