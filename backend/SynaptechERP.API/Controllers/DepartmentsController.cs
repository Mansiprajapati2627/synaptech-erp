// Controllers/DepartmentsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DepartmentsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/departments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DepartmentDto>>> GetDepartments()
    {
        var departments = await _context.Departments
            .OrderBy(d => d.Id)
            .ToListAsync();

        var employees = await _context.Employees
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var nonAdminEmployees = employees
            .Where(e => (e.Employment?.Designation?.Name ?? "Employee").ToLower() != "admin")
            .Select(e => new
            {
                e.Id,
                e.Name,
                Role = e.Employment?.Designation?.Name ?? "Employee",
                e.Email,
                e.PhotoUrl,
                Department = e.Employment?.Department?.Name ?? string.Empty
            })
            .ToList();

        var result = departments.Select(d =>
        {
            var members = nonAdminEmployees
                .Where(e => string.Equals(e.Department, d.Name, StringComparison.OrdinalIgnoreCase))
                .Select(e => new DepartmentMemberDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Role = e.Role,
                    Email = e.Email,
                    PhotoUrl = e.PhotoUrl
                })
                .ToList();

            return new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Initials = d.Name.Length >= 2 ? d.Name[..2].ToUpper() : d.Name.ToUpper(),
                Description = d.Description,
                Lead = d.Lead,
                Color = string.IsNullOrWhiteSpace(d.Color) ? "teal" : d.Color,
                MemberCount = members.Count,
                Members = members,
                CreatedAt = d.CreatedAt
            };
        }).ToList();

        return Ok(result);
    }

    // GET: api/departments/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> GetDepartment(int id)
    {
        var d = await _context.Departments.FindAsync(id);
        if (d == null)
            return NotFound(new { message = $"Department with ID {id} not found." });

        var employees = await _context.Employees
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? "Employee").ToLower() != "admin" &&
                        string.Equals(e.Employment?.Department?.Name, d.Name, StringComparison.OrdinalIgnoreCase))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Employment?.Designation?.Name ?? "Employee",
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToList();

        var dto = new DepartmentDto
        {
            Id = d.Id,
            Name = d.Name,
            Initials = d.Name.Length >= 2 ? d.Name[..2].ToUpper() : d.Name.ToUpper(),
            Description = d.Description,
            Lead = d.Lead,
            Color = string.IsNullOrWhiteSpace(d.Color) ? "teal" : d.Color,
            MemberCount = members.Count,
            Members = members,
            CreatedAt = d.CreatedAt
        };

        return Ok(dto);
    }

    // POST: api/departments
    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment([FromBody] CreateDepartmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Department name is required." });

        var trimmedName = dto.Name.Trim();

        var exists = await _context.Departments
            .AnyAsync(d => d.Name.ToLower() == trimmedName.ToLower());

        if (exists)
            return BadRequest(new { message = $"Department '{trimmedName}' already exists." });

        var dept = new Department
        {
            Name = trimmedName,
            Description = dto.Description?.Trim(),
            Lead = dto.Lead?.Trim(),
            Color = string.IsNullOrWhiteSpace(dto.Color) ? "teal" : dto.Color.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(dept);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(dept.Lead))
        {
            var leadEmp = await _context.Employees
                .Include(e => e.Employment)
                .FirstOrDefaultAsync(e => (e.FirstName + " " + e.LastName).ToLower() == dept.Lead.ToLower());

            if (leadEmp != null)
            {
                if (leadEmp.Employment == null)
                {
                    leadEmp.Employment = new EmployeeEmployment { EmployeeId = leadEmp.Id, DepartmentId = dept.Id };
                    _context.EmployeeEmployments.Add(leadEmp.Employment);
                }
                else
                {
                    leadEmp.Employment.DepartmentId = dept.Id;
                }
                await _context.SaveChangesAsync();
            }
        }

        var employees = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? "Employee").ToLower() != "admin" &&
                        string.Equals(e.Employment?.Department?.Name, dept.Name, StringComparison.OrdinalIgnoreCase))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Employment?.Designation?.Name ?? "Employee",
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToList();

        var resultDto = new DepartmentDto
        {
            Id = dept.Id,
            Name = dept.Name,
            Initials = dept.Name.Length >= 2 ? dept.Name[..2].ToUpper() : dept.Name.ToUpper(),
            Description = dept.Description,
            Lead = dept.Lead,
            Color = dept.Color,
            MemberCount = members.Count,
            Members = members,
            CreatedAt = dept.CreatedAt
        };

        return CreatedAtAction(nameof(GetDepartment), new { id = dept.Id }, resultDto);
    }

    // PUT: api/departments/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(int id, [FromBody] UpdateDepartmentDto dto)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept == null)
            return NotFound(new { message = $"Department with ID {id} not found." });

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Department name is required." });

        var newName = dto.Name.Trim();
        var oldName = dept.Name;

        if (!string.Equals(oldName, newName, StringComparison.OrdinalIgnoreCase))
        {
            var nameTaken = await _context.Departments
                .AnyAsync(d => d.Id != id && d.Name.ToLower() == newName.ToLower());

            if (nameTaken)
                return BadRequest(new { message = $"Department '{newName}' already exists." });
        }

        dept.Name = newName;
        dept.Description = dto.Description?.Trim();
        dept.Lead = dto.Lead?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Color))
            dept.Color = dto.Color.Trim();

        await _context.SaveChangesAsync();

        var employees = await _context.Employees
            .Include(e => e.Employment).ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? "Employee").ToLower() != "admin" &&
                        string.Equals(e.Employment?.Department?.Name, dept.Name, StringComparison.OrdinalIgnoreCase))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Employment?.Designation?.Name ?? "Employee",
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToList();

        var resultDto = new DepartmentDto
        {
            Id = dept.Id,
            Name = dept.Name,
            Initials = dept.Name.Length >= 2 ? dept.Name[..2].ToUpper() : dept.Name.ToUpper(),
            Description = dept.Description,
            Lead = dept.Lead,
            Color = dept.Color,
            MemberCount = members.Count,
            Members = members,
            CreatedAt = dept.CreatedAt
        };

        return Ok(resultDto);
    }

    // DELETE: api/departments/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept == null)
            return NotFound(new { message = $"Department with ID {id} not found." });

        var employments = await _context.EmployeeEmployments
            .Where(ee => ee.DepartmentId == id)
            .ToListAsync();

        foreach (var emp in employments)
        {
            emp.DepartmentId = null;
        }

        _context.Departments.Remove(dept);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/departments/5/members
    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AssignMemberDto dto)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept == null)
            return NotFound(new { message = $"Department with ID {id} not found." });

        var emp = await _context.Employees
            .Include(e => e.Employment)
            .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId);

        if (emp == null)
            return NotFound(new { message = "Employee not found." });

        if (emp.Employment == null)
        {
            emp.Employment = new EmployeeEmployment { EmployeeId = emp.Id, DepartmentId = dept.Id };
            _context.EmployeeEmployments.Add(emp.Employment);
        }
        else
        {
            emp.Employment.DepartmentId = dept.Id;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Employee '{emp.Name}' assigned to department '{dept.Name}'." });
    }

    // DELETE: api/departments/5/members/12
    [HttpDelete("{id:int}/members/{employeeId:int}")]
    public async Task<IActionResult> RemoveMember(int id, int employeeId)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept == null)
            return NotFound(new { message = $"Department with ID {id} not found." });

        var emp = await _context.Employees
            .Include(e => e.Employment)
            .FirstOrDefaultAsync(e => e.Id == employeeId);

        if (emp == null)
            return NotFound(new { message = "Employee not found." });

        if (emp.Employment != null && emp.Employment.DepartmentId == id)
        {
            emp.Employment.DepartmentId = null;
        }

        if (string.Equals(dept.Lead, emp.Name, StringComparison.OrdinalIgnoreCase))
        {
            dept.Lead = null;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
