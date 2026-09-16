using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaveRequestsController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeaveRequestsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetLeaveRequests([FromQuery] int? employeeId, [FromQuery] string? status)
    {
        var query = _db.LeaveRequests.AsQueryable();

        if (employeeId.HasValue && employeeId.Value > 0)
        {
            query = query.Where(l => l.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(l => l.Status.ToLower() == status.ToLower().Trim());
        }

        var list = await query.OrderByDescending(l => l.AppliedOn).ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLeaveRequest([FromBody] LeaveRequest dto)
    {
        if (dto.EmployeeId <= 0)
        {
            return BadRequest(new { message = "Invalid EmployeeId" });
        }

        var emp = await _db.Employees.FindAsync(dto.EmployeeId);
        if (emp != null && string.IsNullOrWhiteSpace(dto.EmployeeName))
        {
            dto.EmployeeName = $"{emp.FirstName} {emp.LastName}".Trim();
        }

        if (string.IsNullOrWhiteSpace(dto.StartDate))
        {
            dto.StartDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        }
        if (string.IsNullOrWhiteSpace(dto.EndDate))
        {
            dto.EndDate = dto.StartDate;
        }

        if (DateTime.TryParse(dto.StartDate, out var start) && DateTime.TryParse(dto.EndDate, out var end))
        {
            dto.TotalDays = Math.Max(1, (int)(end - start).TotalDays + 1);
        }

        dto.Status = "Pending";
        dto.AppliedOn = DateTime.UtcNow;

        _db.LeaveRequests.Add(dto);
        await _db.SaveChangesAsync();

        return Ok(dto);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateLeaveStatus(int id, [FromBody] UpdateLeaveStatusDto req)
    {
        var leave = await _db.LeaveRequests.FindAsync(id);
        if (leave == null)
        {
            return NotFound(new { message = "Leave request not found" });
        }

        leave.Status = req.Status;
        leave.ApprovedBy = req.ApprovedBy ?? "Admin";
        leave.ActionDate = DateTime.UtcNow;

        // ✅ CONNECTION TO ATTENDANCE: When Leave is Approved, mark Attendance as "On Leave" for those dates
        if (leave.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            if (DateTime.TryParse(leave.StartDate, out var start) && DateTime.TryParse(leave.EndDate, out var end))
            {
                for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
                {
                    var dateStr = date.ToString("yyyy-MM-dd");
                    var att = await _db.AttendanceRecords.FirstOrDefaultAsync(a => a.EmployeeId == leave.EmployeeId && a.Date == dateStr);
                    if (att == null)
                    {
                        att = new AttendanceRecord
                        {
                            EmployeeId = leave.EmployeeId,
                            EmployeeName = leave.EmployeeName,
                            Date = dateStr,
                            Status = "On Leave",
                            WorkedHours = 0,
                            TotalBreakMinutes = 0
                        };
                        _db.AttendanceRecords.Add(att);
                    }
                    else
                    {
                        att.Status = "On Leave";
                        att.CheckIn = null;
                        att.CheckOut = null;
                        att.WorkedHours = 0;
                    }
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(leave);
    }
}

public class UpdateLeaveStatusDto
{
    public string Status { get; set; } = "Approved"; // Approved, Rejected
    public string? ApprovedBy { get; set; }
}
