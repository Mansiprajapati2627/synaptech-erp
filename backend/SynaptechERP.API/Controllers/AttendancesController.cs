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

    // GET: api/attendances?date=2026-09-11
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetAttendances([FromQuery] string? date)
    {
        var targetDate = string.IsNullOrWhiteSpace(date) ? GetLocalDateString() : date.Trim();
        var weekend = IsWeekend(targetDate);

        var activeEmployees = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin")
            .ToListAsync();

        var existingRecords = await _context.AttendanceRecords
            .Where(a => a.Date == targetDate)
            .ToListAsync();

        var recordMap = existingRecords.ToDictionary(r => r.EmployeeId);
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
                // Ensure name & department stay updated with employee table
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
            .Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.EmployeeName,
                Department = a.Department ?? "Unassigned",
                Date = a.Date,
                Status = a.Status,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                WorkedHours = a.WorkedHours,
                Initials = GetInitials(a.EmployeeName)
            })
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

            var dto = new AttendanceDto
            {
                Id = rec.Id,
                EmployeeId = rec.EmployeeId,
                EmployeeName = rec.EmployeeName,
                Department = rec.Department ?? "Unassigned",
                Date = rec.Date,
                Status = rec.Status,
                CheckIn = rec.CheckIn,
                CheckOut = rec.CheckOut,
                WorkedHours = rec.WorkedHours,
                Initials = GetInitials(rec.EmployeeName)
            };

            return Ok(new List<AttendanceDto> { dto });
        }

        var history = await _context.AttendanceRecords
            .Where(a => a.EmployeeId == employeeId)
            .OrderByDescending(a => a.Date)
            .Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.EmployeeName,
                Department = a.Department ?? "Unassigned",
                Date = a.Date,
                Status = a.Status,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                WorkedHours = a.WorkedHours,
                Initials = GetInitials(a.EmployeeName)
            })
            .ToListAsync();

        return Ok(history);
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

        var resultDto = new AttendanceDto
        {
            Id = rec.Id,
            EmployeeId = rec.EmployeeId,
            EmployeeName = rec.EmployeeName,
            Department = rec.Department ?? "Unassigned",
            Date = rec.Date,
            Status = rec.Status,
            CheckIn = rec.CheckIn,
            CheckOut = rec.CheckOut,
            WorkedHours = rec.WorkedHours,
            Initials = GetInitials(rec.EmployeeName)
        };

        return Ok(resultDto);
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

        if (DateTime.TryParse(rec.CheckIn, out var checkInTime))
        {
            var diff = now - checkInTime;
            if (diff.TotalHours > 0)
            {
                rec.WorkedHours = Math.Round(diff.TotalHours, 2);
            }
        }

        await _context.SaveChangesAsync();

        var resultDto = new AttendanceDto
        {
            Id = rec.Id,
            EmployeeId = rec.EmployeeId,
            EmployeeName = rec.EmployeeName,
            Department = rec.Department ?? "Unassigned",
            Date = rec.Date,
            Status = rec.Status,
            CheckIn = rec.CheckIn,
            CheckOut = rec.CheckOut,
            WorkedHours = rec.WorkedHours,
            Initials = GetInitials(rec.EmployeeName)
        };

        return Ok(resultDto);
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

        var resultDto = new AttendanceDto
        {
            Id = rec.Id,
            EmployeeId = rec.EmployeeId,
            EmployeeName = rec.EmployeeName,
            Department = rec.Department ?? "Unassigned",
            Date = rec.Date,
            Status = rec.Status,
            CheckIn = rec.CheckIn,
            CheckOut = rec.CheckOut,
            WorkedHours = rec.WorkedHours,
            Initials = GetInitials(rec.EmployeeName)
        };

        return Ok(resultDto);
    }

    // POST: api/attendances/mark-all-present?date=2026-09-11
    [HttpPost("mark-all-present")]
    public async Task<IActionResult> MarkAllPresent([FromQuery] string? date)
    {
        var targetDate = string.IsNullOrWhiteSpace(date) ? GetLocalDateString() : date.Trim();
        var nowStr = DateTime.Now.ToString("hh:mm tt");

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
                    resultList.Add(new AttendanceDto
                    {
                        Id = rec.Id,
                        EmployeeId = rec.EmployeeId,
                        EmployeeName = rec.EmployeeName,
                        Department = rec.Department ?? "Unassigned",
                        Date = rec.Date,
                        Status = rec.Status,
                        CheckIn = rec.CheckIn,
                        CheckOut = rec.CheckOut,
                        WorkedHours = rec.WorkedHours,
                        Initials = GetInitials(rec.EmployeeName)
                    });
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
