// DTOs/PayrollDtos.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class PayrollRecordDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public decimal BaseSalary { get; set; }
    public decimal Allowances { get; set; }
    public decimal Deductions { get; set; }
    public int DaysInMonth { get; set; }
    public int PresentDays { get; set; }
    public int ApprovedLeaveDays { get; set; }
    public int PayableDays { get; set; }
    public decimal EarnedBaseSalary { get; set; }
    public decimal EarnedAllowances { get; set; }
    public decimal NetSalary { get; set; }
    public string Month { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}

public class GeneratePayrollRequestDto
{
    [Required]
    public string Month { get; set; } = string.Empty; // e.g., "2026-09"
}

public class UpdatePayrollSalaryDto
{
    public decimal BaseSalary { get; set; }
    public decimal Allowances { get; set; }
    public decimal Deductions { get; set; }
    public string? Status { get; set; }
}
