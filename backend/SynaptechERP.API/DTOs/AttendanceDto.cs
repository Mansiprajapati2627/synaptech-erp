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
    public string? ActiveBreakType { get; set; }
    public string? ActiveBreakStartTime { get; set; }
    public bool IsOnBreak { get; set; }
    public int TotalBreakMinutes { get; set; }
    public string? BreakLogs { get; set; }
    public double WorkedHours { get; set; }
    public string Initials { get; set; } = string.Empty;
}

public class BreakLogItemDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "Break";
    public string StartTime { get; set; } = string.Empty;
    public string? EndTime { get; set; }
    public int DurationMins { get; set; }
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

public class BreakToggleRequestDto
{
    [Required]
    public int EmployeeId { get; set; }
    public string? Date { get; set; }
    public string? BreakType { get; set; } = "Tea Break";
}

public class ManualPunchRequestDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public string Date { get; set; } = string.Empty;

    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public string? BreakStart { get; set; }
    public string? BreakEnd { get; set; }
    public string? BreakType { get; set; }
    public string? Reason { get; set; }
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
