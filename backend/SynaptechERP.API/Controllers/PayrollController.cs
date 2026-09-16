// Controllers/PayrollController.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _context;

    public PayrollController(AppDbContext context)
    {
        _context = context;
    }

    // GET: /api/Payroll?month=2026-09
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PayrollRecordDto>>> GetPayroll([FromQuery] string? month)
    {
        var query = _context.PayrollRecords.AsQueryable();
        if (!string.IsNullOrWhiteSpace(month))
        {
            query = query.Where(p => p.Month == month.Trim());
        }

        var records = await query.OrderBy(p => p.EmployeeName).ToListAsync();

        // If no records exist for target month, auto-generate for active employees dynamically
        if (!records.Any() && !string.IsNullOrWhiteSpace(month))
        {
            records = await GeneratePayrollInternalAsync(month.Trim());
        }

        return Ok(records.Select(MapToDto));
    }

    // GET: /api/Payroll/my-payslips
    [HttpGet("my-payslips")]
    public async Task<ActionResult<IEnumerable<PayrollRecordDto>>> GetMyPayslips()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId || (userEmail != null && e.Email.ToLower() == userEmail));

        var query = _context.PayrollRecords.AsQueryable();
        if (employee != null)
        {
            query = query.Where(p => p.EmployeeId == employee.Id || p.Email.ToLower() == employee.Email.ToLower());
        }
        else if (!string.IsNullOrEmpty(userEmail))
        {
            query = query.Where(p => p.Email.ToLower() == userEmail);
        }

        var records = await query.OrderByDescending(p => p.Month).ToListAsync();
        return Ok(records.Select(MapToDto));
    }

    // POST: /api/Payroll/generate
    [HttpPost("generate")]
    public async Task<ActionResult<IEnumerable<PayrollRecordDto>>> GeneratePayroll([FromBody] GeneratePayrollRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Month))
            return BadRequest(new { message = "Month parameter (YYYY-MM) is required." });

        var records = await GeneratePayrollInternalAsync(dto.Month.Trim());
        return Ok(records.Select(MapToDto));
    }

    // PUT: /api/Payroll/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePayrollRecord(int id, [FromBody] UpdatePayrollSalaryDto dto)
    {
        var record = await _context.PayrollRecords.FindAsync(id);
        if (record == null)
            return NotFound(new { message = "Payroll record not found." });

        record.BaseSalary = dto.BaseSalary;
        record.Allowances = dto.Allowances;
        record.Deductions = dto.Deductions;
        if (!string.IsNullOrWhiteSpace(dto.Status)) record.Status = dto.Status;

        // Recalculate earned figures
        decimal dailyRate = record.DaysInMonth > 0 ? record.BaseSalary / record.DaysInMonth : 0;
        decimal dailyAllowanceRate = record.DaysInMonth > 0 ? record.Allowances / record.DaysInMonth : 0;

        record.EarnedBaseSalary = Math.Round(dailyRate * record.PayableDays, 2);
        record.EarnedAllowances = Math.Round(dailyAllowanceRate * record.PayableDays, 2);
        record.NetSalary = Math.Round(record.EarnedBaseSalary + record.EarnedAllowances - record.Deductions, 2);
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(record));
    }

    // DELETE: /api/Payroll/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePayrollRecord(int id)
    {
        var record = await _context.PayrollRecords.FindAsync(id);
        if (record == null)
            return NotFound(new { message = "Payroll record not found." });

        _context.PayrollRecords.Remove(record);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payroll record deleted." });
    }

    private async Task<List<PayrollRecord>> GeneratePayrollInternalAsync(string targetMonth)
    {
        var parts = targetMonth.Split('-');
        if (parts.Length != 2 || !int.TryParse(parts[0], out int year) || !int.TryParse(parts[1], out int monthNum))
        {
            year = DateTime.UtcNow.Year;
            monthNum = DateTime.UtcNow.Month;
            targetMonth = $"{year:D4}-{monthNum:D2}";
        }

        int daysInMonth = DateTime.DaysInMonth(year, monthNum);
        var activeEmployees = await _context.Employees.ToListAsync();

        var existingRecords = await _context.PayrollRecords.Where(p => p.Month == targetMonth).ToListAsync();
        var existingEmpIds = existingRecords.Select(r => r.EmployeeId).ToHashSet();

        var attendanceList = await _context.AttendanceRecords.Where(a => a.Date.StartsWith(targetMonth)).ToListAsync();
        var leavesList = await _context.LeaveRequests.Where(l => l.Status == "Approved").ToListAsync();

        var newRecords = new List<PayrollRecord>();

        foreach (var emp in activeEmployees)
        {
            if (existingEmpIds.Contains(emp.Id)) continue;

            int presentDays = attendanceList.Count(a => a.EmployeeId == emp.Id && (a.Status == "Present" || a.Status == "On Leave"));
            int approvedLeaves = 0;

            foreach (var leave in leavesList.Where(l => l.EmployeeId == emp.Id))
            {
                if (DateTime.TryParse(leave.StartDate, out DateTime sDate) && DateTime.TryParse(leave.EndDate, out DateTime eDate))
                {
                    if (sDate.Year == year && sDate.Month == monthNum)
                    {
                        approvedLeaves += leave.TotalDays;
                    }
                }
            }

            int payableDays = Math.Min(daysInMonth, presentDays + approvedLeaves);
            if (payableDays == 0 && attendanceList.Count == 0)
            {
                payableDays = daysInMonth; // Default to full month if no attendance entries recorded yet
            }

            decimal baseSalary = 50000;
            decimal allowances = 5000;
            decimal deductions = 2000;

            decimal dailyRate = baseSalary / daysInMonth;
            decimal dailyAllowanceRate = allowances / daysInMonth;

            decimal earnedBase = Math.Round(dailyRate * payableDays, 2);
            decimal earnedAllowances = Math.Round(dailyAllowanceRate * payableDays, 2);
            decimal netSalary = Math.Round(earnedBase + earnedAllowances - deductions, 2);

            var rec = new PayrollRecord
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Email = emp.Email,
                Department = string.IsNullOrWhiteSpace(emp.Department) ? "General" : emp.Department,
                Role = string.IsNullOrWhiteSpace(emp.Role) ? "Employee" : emp.Role,
                BaseSalary = baseSalary,
                Allowances = allowances,
                Deductions = deductions,
                DaysInMonth = daysInMonth,
                PresentDays = presentDays,
                ApprovedLeaveDays = approvedLeaves,
                PayableDays = payableDays,
                EarnedBaseSalary = earnedBase,
                EarnedAllowances = earnedAllowances,
                NetSalary = netSalary,
                Month = targetMonth,
                Year = year,
                Status = "Processed",
                CreatedAt = DateTime.UtcNow
            };

            _context.PayrollRecords.Add(rec);
            newRecords.Add(rec);
        }

        if (newRecords.Any())
        {
            await _context.SaveChangesAsync();
        }

        return await _context.PayrollRecords.Where(p => p.Month == targetMonth).OrderBy(p => p.EmployeeName).ToListAsync();
    }

    private static PayrollRecordDto MapToDto(PayrollRecord r)
    {
        return new PayrollRecordDto
        {
            Id = r.Id,
            EmployeeId = r.EmployeeId,
            EmployeeName = r.EmployeeName,
            Email = r.Email,
            Department = r.Department,
            Role = r.Role,
            BaseSalary = r.BaseSalary,
            Allowances = r.Allowances,
            Deductions = r.Deductions,
            DaysInMonth = r.DaysInMonth,
            PresentDays = r.PresentDays,
            ApprovedLeaveDays = r.ApprovedLeaveDays,
            PayableDays = r.PayableDays,
            EarnedBaseSalary = r.EarnedBaseSalary,
            EarnedAllowances = r.EarnedAllowances,
            NetSalary = r.NetSalary,
            Month = r.Month,
            Year = r.Year,
            Status = r.Status,
            CreatedAt = r.CreatedAt
        };
    }
}
