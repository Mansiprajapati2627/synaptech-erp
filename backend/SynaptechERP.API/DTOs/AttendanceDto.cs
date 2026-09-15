// DTOs/AttendanceDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class AttendanceDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Status { get; set; } = "Absent";
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public string? BreakTime { get; set; }
    public string? BreakStart { get; set; }
    public string? BreakEnd { get; set; }
    public bool IsOnBreak { get; set; }
    public double WorkedHours { get; set; }
    public string Initials { get; set; } = string.Empty;
}

public class ClockInRequestDto
{
    [Required]
    public int EmployeeId { get; set; }
    public string? Date { get; set; }
}

public class ClockOutRequestDto
{
    [Required]
    public int EmployeeId { get; set; }
    public string? Date { get; set; }
}

public class UpdateAttendanceRequestDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public string Date { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = "Present";

    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public double WorkedHours { get; set; }
}
