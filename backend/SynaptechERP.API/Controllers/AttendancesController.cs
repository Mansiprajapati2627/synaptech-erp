// Controllers/AttendancesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttendancesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttendancesController(AppDbContext context)
    {
        _context = context;
    }

    private static string GetLocalDateString(DateTime? dt = null)
    {
        var target = dt ?? DateTime.Now;
        return target.ToString("yyyy-MM-dd");
    }

    private static bool IsWeekend(string dateStr)
    {
        if (DateTime.TryParse(dateStr, out var d))
        {
            return d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday;
        }
        return false;
    }

    private static string GetInitials(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "EM";
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2)
            return $"{parts[0][0]}{parts[1][0]}".ToUpper();
        return name.Length >= 2 ? name[..2].ToUpper() : name.ToUpper();
    }

    private static AttendanceDto ToDto(AttendanceRecord a)
    {
        bool isOnBreak = !string.IsNullOrWhiteSpace(a.BreakStart) && string.IsNullOrWhiteSpace(a.BreakEnd);
        string breakDisplay = a.BreakTime ?? (isOnBreak ? $"On break since {a.BreakStart}" : "—");
        if (a.TotalBreakMinutes > 0 && (string.IsNullOrWhiteSpace(a.BreakTime) || a.BreakTime == "—"))
        {
            breakDisplay = $"{a.TotalBreakMinutes} mins total break";
        }

        return new AttendanceDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            EmployeeName = a.EmployeeName,
            Department = a.Department ?? "Unassigned",
            Date = a.Date,
            Status = a.Status,
            CheckIn = a.CheckIn,
            CheckOut = a.CheckOut,
            BreakTime = breakDisplay,
            BreakStart = a.BreakStart,
            BreakEnd = a.BreakEnd,
            IsOnBreak = isOnBreak,
            TotalBreakMinutes = a.TotalBreakMinutes,
            BreakLogs = a.BreakLogs,
            WorkedHours = a.WorkedHours,
            Initials = GetInitials(a.EmployeeName)
        };
    }

    // GET: api/attendances?date=2026-09-11
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetAttendances([FromQuery] string? date)
    {
        var targetDate = string.IsNullOrWhiteSpace(date) ? GetLocalDateString() : date.Trim();
        var weekend = IsWeekend(targetDate);

        var allEmployees = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee.Designation)
            .ToListAsync();

        var activeEmployees = allEmployees
            .Where(e => !string.Equals(e.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var existingRecords = await _context.AttendanceRecords
            .Where(a => a.Date == targetDate)
            .ToListAsync();

        var recordMap = existingRecords
            .GroupBy(r => r.EmployeeId)
            .ToDictionary(g => g.Key, g => g.First());
        var newRecords = new List<AttendanceRecord>();

        foreach (var emp in activeEmployees)
        {
            if (!recordMap.ContainsKey(emp.Id))
            {
                var newRec = new AttendanceRecord
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.Name,
                    Department = emp.Department ?? "Unassigned",
                    Date = targetDate,
                    Status = weekend ? "Weekend" : "Absent",
                    CheckIn = null,
                    CheckOut = null,
                    WorkedHours = 0,
                    CreatedAt = DateTime.UtcNow
                };
                newRecords.Add(newRec);
                _context.AttendanceRecords.Add(newRec);
            }
            else
            {
                var rec = recordMap[emp.Id];
                rec.EmployeeName = emp.Name;
                rec.Department = emp.Department ?? "Unassigned";
            }
        }

        if (newRecords.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        var allRecords = await _context.AttendanceRecords
            .Where(a => a.Date == targetDate)
            .ToListAsync();

        var result = allRecords
            .Where(a => activeEmployees.Any(e => e.Id == a.EmployeeId))
            .Select(ToDto)
            .OrderBy(a => a.Department)
            .ThenBy(a => a.EmployeeName)
            .ToList();

        return Ok(result);
    }

    // GET: api/attendances/employee/5?date=2026-09-11
    [HttpGet("employee/{employeeId:int}")]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetEmployeeAttendance(int employeeId, [FromQuery] string? date)
    {
        var emp = await _context.Employees.FindAsync(employeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        if (!string.IsNullOrWhiteSpace(date))
        {
            var targetDate = date.Trim();
            var rec = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == targetDate);

            if (rec == null)
            {
                rec = new AttendanceRecord
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.Name,
                    Department = emp.Department ?? "Unassigned",
                    Date = targetDate,
                    Status = IsWeekend(targetDate) ? "Weekend" : "Absent",
                    CheckIn = null,
                    CheckOut = null,
                    WorkedHours = 0,
                    CreatedAt = DateTime.UtcNow
                };
                _context.AttendanceRecords.Add(rec);
                await _context.SaveChangesAsync();
            }

            return Ok(new List<AttendanceDto> { ToDto(rec) });
        }

        var history = await _context.AttendanceRecords
            .Where(a => a.EmployeeId == employeeId)
            .OrderByDescending(a => a.Date)
            .ToListAsync();

        return Ok(history.Select(ToDto));
    }

    // POST: api/attendances/clock-in
    [HttpPost("clock-in")]
    public async Task<ActionResult<AttendanceDto>> ClockIn([FromBody] ClockInRequestDto dto)
    {
        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        var targetDate = string.IsNullOrWhiteSpace(dto.Date) ? GetLocalDateString() : dto.Date.Trim();

        var rec = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == targetDate);

        if (rec == null)
        {
            rec = new AttendanceRecord
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Department = emp.Department ?? "Unassigned",
                Date = targetDate,
                Status = "Present",
                CreatedAt = DateTime.UtcNow
            };
            _context.AttendanceRecords.Add(rec);
        }

        if (!string.IsNullOrWhiteSpace(rec.CheckIn))
            return BadRequest(new { message = "Already clocked in today." });

        var now = DateTime.Now;
        rec.CheckIn = now.ToString("hh:mm tt");

        if (now.Hour > 10 || (now.Hour == 10 && now.Minute > 0))
        {
            rec.Status = "Late";
        }
        else
        {
            rec.Status = "Present";
        }

        emp.Status = "Present";

        await _context.SaveChangesAsync();
        return Ok(ToDto(rec));
    }

    // POST: api/attendances/break
    [HttpPost("break")]
    public async Task<ActionResult<AttendanceDto>> ToggleBreak([FromBody] BreakToggleRequestDto dto)
    {
        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        var targetDate = string.IsNullOrWhiteSpace(dto.Date) ? GetLocalDateString() : dto.Date.Trim();

        var rec = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == targetDate);

        if (rec == null || string.IsNullOrWhiteSpace(rec.CheckIn))
            return BadRequest(new { message = "Must clock in before starting break." });

        if (!string.IsNullOrWhiteSpace(rec.CheckOut))
            return BadRequest(new { message = "Already clocked out today." });

        var now = DateTime.Now;
        var nowStr = now.ToString("hh:mm tt");
        string requestedBreakType = string.IsNullOrWhiteSpace(dto.BreakType) ? "Tea Break" : dto.BreakType.Trim();

        List<BreakLogItemDto> logs = new();
        if (!string.IsNullOrWhiteSpace(rec.BreakLogs))
        {
            try
            {
                logs = System.Text.Json.JsonSerializer.Deserialize<List<BreakLogItemDto>>(rec.BreakLogs) ?? new();
            }
            catch { }
        }

        bool currentlyOnBreak = !string.IsNullOrWhiteSpace(rec.BreakStart) && string.IsNullOrWhiteSpace(rec.BreakEnd);

        if (!currentlyOnBreak)
        {
            // Start Break
            rec.BreakStart = nowStr;
            rec.BreakEnd = null;

            logs.Add(new BreakLogItemDto
            {
                Id = logs.Count + 1,
                Type = requestedBreakType,
                StartTime = nowStr,
                EndTime = null,
                DurationMins = 0
            });
        }
        else
        {
            // End Break
            rec.BreakEnd = nowStr;

            var activeLog = logs.LastOrDefault(l => string.IsNullOrEmpty(l.EndTime));
            if (activeLog != null)
            {
                activeLog.EndTime = nowStr;
                if (DateTime.TryParse(activeLog.StartTime, out var st) && DateTime.TryParse(nowStr, out var et))
                {
                    var diff = et - st;
                    activeLog.DurationMins = Math.Max(1, (int)Math.Round(diff.TotalMinutes));
                }
                else
                {
                    activeLog.DurationMins = 15;
                }
            }
            else
            {
                logs.Add(new BreakLogItemDto
                {
                    Id = logs.Count + 1,
                    Type = requestedBreakType,
                    StartTime = rec.BreakStart ?? nowStr,
                    EndTime = nowStr,
                    DurationMins = 15
                });
            }

            int totalMins = logs.Where(l => l.DurationMins > 0).Sum(l => l.DurationMins);
            rec.TotalBreakMinutes = totalMins;
            rec.BreakTime = $"{totalMins} mins ({logs.Count} break{(logs.Count > 1 ? "s" : "")})";
        }

        rec.BreakLogs = System.Text.Json.JsonSerializer.Serialize(logs);
        await _context.SaveChangesAsync();

        return Ok(ToDto(rec));
    }

    // POST: api/attendances/manual-punch
    [HttpPost("manual-punch")]
    public async Task<ActionResult<AttendanceDto>> ManualPunch([FromBody] ManualPunchRequestDto dto)
    {
        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        var targetDate = string.IsNullOrWhiteSpace(dto.Date) ? GetLocalDateString() : dto.Date.Trim();

        var rec = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == targetDate);

        if (rec == null)
        {
            rec = new AttendanceRecord
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Department = emp.Department ?? "Unassigned",
                Date = targetDate,
                Status = "Present",
                CreatedAt = DateTime.UtcNow
            };
            _context.AttendanceRecords.Add(rec);
        }

        if (!string.IsNullOrWhiteSpace(dto.CheckIn)) rec.CheckIn = dto.CheckIn.Trim();
        if (!string.IsNullOrWhiteSpace(dto.CheckOut)) rec.CheckOut = dto.CheckOut.Trim();

        if (!string.IsNullOrWhiteSpace(dto.BreakStart) && !string.IsNullOrWhiteSpace(dto.BreakEnd))
        {
            rec.BreakStart = dto.BreakStart.Trim();
            rec.BreakEnd = dto.BreakEnd.Trim();

            List<BreakLogItemDto> logs = new();
            if (!string.IsNullOrWhiteSpace(rec.BreakLogs))
            {
                try
                {
                    logs = System.Text.Json.JsonSerializer.Deserialize<List<BreakLogItemDto>>(rec.BreakLogs) ?? new();
                }
                catch { }
            }

            int dur = 15;
            if (DateTime.TryParse(dto.BreakStart, out var bs) && DateTime.TryParse(dto.BreakEnd, out var be))
            {
                var diff = be - bs;
                if (diff.TotalMinutes > 0) dur = (int)Math.Round(diff.TotalMinutes);
            }

            logs.Add(new BreakLogItemDto
            {
                Id = logs.Count + 1,
                Type = string.IsNullOrWhiteSpace(dto.BreakType) ? "Manual Break" : dto.BreakType.Trim(),
                StartTime = dto.BreakStart.Trim(),
                EndTime = dto.BreakEnd.Trim(),
                DurationMins = dur
            });

            int totalMins = logs.Sum(l => l.DurationMins);
            rec.TotalBreakMinutes = totalMins;
            rec.BreakLogs = System.Text.Json.JsonSerializer.Serialize(logs);
            rec.BreakTime = $"{totalMins} mins total break";
        }

        // Calculate worked hours
        if (!string.IsNullOrWhiteSpace(rec.CheckIn) && !string.IsNullOrWhiteSpace(rec.CheckOut))
        {
            if (DateTime.TryParse(rec.CheckIn, out var cIn) && DateTime.TryParse(rec.CheckOut, out var cOut))
            {
                var grossDuration = cOut - cIn;
                double grossHours = grossDuration.TotalHours > 0 ? grossDuration.TotalHours : 8.0;
                double breakHours = rec.TotalBreakMinutes / 60.0;
                rec.WorkedHours = Math.Max(0, Math.Round(grossHours - breakHours, 2));
            }
        }

        rec.Status = "Present";
        if (targetDate == GetLocalDateString())
        {
            emp.Status = "Present";
        }

        await _context.SaveChangesAsync();
        return Ok(ToDto(rec));
    }

    // POST: api/attendances/clock-out
    [HttpPost("clock-out")]
    public async Task<ActionResult<AttendanceDto>> ClockOut([FromBody] ClockOutRequestDto dto)
    {
        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        var targetDate = string.IsNullOrWhiteSpace(dto.Date) ? GetLocalDateString() : dto.Date.Trim();

        var rec = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == targetDate);

        if (rec == null || string.IsNullOrWhiteSpace(rec.CheckIn))
            return BadRequest(new { message = "Must clock in before clocking out." });

        if (!string.IsNullOrWhiteSpace(rec.CheckOut))
            return BadRequest(new { message = "Already clocked out today." });

        var now = DateTime.Now;
        rec.CheckOut = now.ToString("hh:mm tt");

        // Close any active break if currently on break when clocking out
        if (!string.IsNullOrWhiteSpace(rec.BreakStart) && string.IsNullOrWhiteSpace(rec.BreakEnd))
        {
            rec.BreakEnd = rec.CheckOut;
            List<BreakLogItemDto> logs = new();
            if (!string.IsNullOrWhiteSpace(rec.BreakLogs))
            {
                try { logs = System.Text.Json.JsonSerializer.Deserialize<List<BreakLogItemDto>>(rec.BreakLogs) ?? new(); } catch { }
            }

            var activeLog = logs.LastOrDefault(l => string.IsNullOrEmpty(l.EndTime));
            if (activeLog != null)
            {
                activeLog.EndTime = rec.CheckOut;
                if (DateTime.TryParse(activeLog.StartTime, out var st))
                {
                    var diff = now - st;
                    activeLog.DurationMins = Math.Max(1, (int)Math.Round(diff.TotalMinutes));
                }
            }
            rec.TotalBreakMinutes = logs.Sum(l => l.DurationMins);
            rec.BreakLogs = System.Text.Json.JsonSerializer.Serialize(logs);
        }

        if (DateTime.TryParse(rec.CheckIn, out var checkInTime))
        {
            var grossDuration = now - checkInTime;
            double grossHours = grossDuration.TotalHours > 0 ? grossDuration.TotalHours : 8.0;
            double breakHours = rec.TotalBreakMinutes / 60.0;
            double netWorkedHours = Math.Max(0, grossHours - breakHours);
            rec.WorkedHours = Math.Round(netWorkedHours, 2);
        }
        else
        {
            rec.WorkedHours = 8.0;
        }

        await _context.SaveChangesAsync();
        return Ok(ToDto(rec));
    }

    // POST: api/attendances/update
    [HttpPost("update")]
    public async Task<ActionResult<AttendanceDto>> UpdateAttendance([FromBody] UpdateAttendanceRequestDto dto)
    {
        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        var targetDate = dto.Date.Trim();
        var rec = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == targetDate);

        if (rec == null)
        {
            rec = new AttendanceRecord
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Department = emp.Department ?? "Unassigned",
                Date = targetDate,
                CreatedAt = DateTime.UtcNow
            };
            _context.AttendanceRecords.Add(rec);
        }

        rec.Status = dto.Status;
        rec.CheckIn = dto.CheckIn;
        rec.CheckOut = dto.CheckOut;
        rec.WorkedHours = dto.WorkedHours;

        if (targetDate == GetLocalDateString())
        {
            emp.Status = dto.Status == "Absent" ? "On leave" : "Present";
        }

        await _context.SaveChangesAsync();
        return Ok(ToDto(rec));
    }

    // POST: api/attendances/mark-all-present?date=2026-09-11
    [HttpPost("mark-all-present")]
    public async Task<IActionResult> MarkAllPresent([FromQuery] string? date)
    {
        var targetDate = string.IsNullOrWhiteSpace(date) ? GetLocalDateString() : date.Trim();

        var activeEmployees = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin")
            .ToListAsync();

        var existing = await _context.AttendanceRecords
            .Where(a => a.Date == targetDate)
            .ToListAsync();

        var map = existing.ToDictionary(a => a.EmployeeId);

        foreach (var emp in activeEmployees)
        {
            if (map.TryGetValue(emp.Id, out var rec))
            {
                rec.Status = "Present";
                if (string.IsNullOrWhiteSpace(rec.CheckIn))
                    rec.CheckIn = "09:00 AM";
            }
            else
            {
                _context.AttendanceRecords.Add(new AttendanceRecord
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.Name,
                    Department = emp.Department ?? "Unassigned",
                    Date = targetDate,
                    Status = "Present",
                    CheckIn = "09:00 AM",
                    WorkedHours = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }
            emp.Status = "Present";
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Marked all employees present." });
    }

    // GET: api/attendances/monthly?month=2026-09
    [HttpGet("monthly")]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetMonthlyAttendance([FromQuery] string? month)
    {
        var targetMonth = string.IsNullOrWhiteSpace(month) ? GetLocalDateString()[..7] : month.Trim();

        if (!DateTime.TryParse($"{targetMonth}-01", out var monthDate))
        {
            return BadRequest(new { message = "Invalid month format. Use YYYY-MM." });
        }

        var daysInMonth = DateTime.DaysInMonth(monthDate.Year, monthDate.Month);

        var activeEmployees = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin")
            .OrderBy(e => e.Department)
            .ThenBy(e => e.Name)
            .ToListAsync();

        var existingRecords = await _context.AttendanceRecords
            .Where(a => a.Date.StartsWith(targetMonth))
            .ToListAsync();

        var recordDict = existingRecords.ToDictionary(r => $"{r.EmployeeId}_{r.Date}");
        var todayStr = GetLocalDateString();
        var resultList = new List<AttendanceDto>();

        for (int day = 1; day <= daysInMonth; day++)
        {
            var dateStr = $"{monthDate.Year:D4}-{monthDate.Month:D2}-{day:D2}";
            var weekend = IsWeekend(dateStr);

            foreach (var emp in activeEmployees)
            {
                var key = $"{emp.Id}_{dateStr}";
                if (recordDict.TryGetValue(key, out var rec))
                {
                    resultList.Add(ToDto(rec));
                }
                else
                {
                    string status = weekend ? "Weekend" : (string.Compare(dateStr, todayStr) <= 0 ? "Absent" : "Scheduled");
                    resultList.Add(new AttendanceDto
                    {
                        Id = 0,
                        EmployeeId = emp.Id,
                        EmployeeName = emp.Name,
                        Department = emp.Department ?? "Unassigned",
                        Date = dateStr,
                        Status = status,
                        CheckIn = null,
                        CheckOut = null,
                        WorkedHours = 0,
                        Initials = GetInitials(emp.Name)
                    });
                }
            }
        }

        return Ok(resultList.OrderBy(r => r.Date).ThenBy(r => r.Department).ThenBy(r => r.EmployeeName));
    }
}
