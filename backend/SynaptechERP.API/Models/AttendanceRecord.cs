// Models/AttendanceRecord.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class AttendanceRecord
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(100)]
    public string EmployeeName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Department { get; set; }

    [Required]
    [MaxLength(10)]
    public string Date { get; set; } = string.Empty; // YYYY-MM-DD

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Absent"; // Present, Absent, Late, Half-day, Weekend

    [MaxLength(20)]
    public string? CheckIn { get; set; }

    [MaxLength(20)]
    public string? CheckOut { get; set; }

    [MaxLength(100)]
    public string? BreakTime { get; set; }

    [MaxLength(20)]
    public string? BreakStart { get; set; }

    [MaxLength(20)]
    public string? BreakEnd { get; set; }

    public double WorkedHours { get; set; } = 0;

    [MaxLength(4000)]
    public string? BreakLogs { get; set; } // JSON array of BreakLogItem

    public int TotalBreakMinutes { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}
