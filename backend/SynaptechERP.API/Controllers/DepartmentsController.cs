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

        var nonAdminEmployees = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin")
            .Select(e => new
            {
                e.Id,
                e.Name,
                e.Role,
                e.Email,
                e.PhotoUrl,
                Department = e.Department ?? string.Empty
            })
            .ToListAsync();

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

        var members = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin" && e.Department == d.Name)
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Role,
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToListAsync();

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

        // If a lead is specified, update that employee's department
        if (!string.IsNullOrWhiteSpace(dept.Lead))
        {
            var leadEmp = await _context.Employees
                .FirstOrDefaultAsync(e => e.Name.ToLower() == dept.Lead.ToLower() && e.Role.ToLower() != "admin");

            if (leadEmp != null)
            {
                leadEmp.Department = dept.Name;
                await _context.SaveChangesAsync();
            }
        }

        var members = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin" && e.Department == dept.Name)
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Role,
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToListAsync();

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

        // Check unique if name changed
        if (!string.Equals(oldName, newName, StringComparison.OrdinalIgnoreCase))
        {
            var nameTaken = await _context.Departments
                .AnyAsync(d => d.Id != id && d.Name.ToLower() == newName.ToLower());

            if (nameTaken)
                return BadRequest(new { message = $"Department '{newName}' already exists." });

            // Update all employees previously in this department
            var formerMembers = await _context.Employees
                .Where(e => e.Department == oldName)
                .ToListAsync();

            foreach (var emp in formerMembers)
            {
                emp.Department = newName;
            }
        }

        dept.Name = newName;
        dept.Description = dto.Description?.Trim();
        dept.Lead = dto.Lead?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Color))
            dept.Color = dto.Color.Trim();

        await _context.SaveChangesAsync();

        var members = await _context.Employees
            .Where(e => e.Role.ToLower() != "admin" && e.Department == dept.Name)
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = e.Role,
                Email = e.Email,
                PhotoUrl = e.PhotoUrl
            })
            .ToListAsync();

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

        // Unassign employees
        var members = await _context.Employees
            .Where(e => e.Department == dept.Name)
            .ToListAsync();

        foreach (var emp in members)
        {
            emp.Department = null;
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

        var emp = await _context.Employees.FindAsync(dto.EmployeeId);
        if (emp == null || emp.Role.ToLower() == "admin")
            return NotFound(new { message = "Employee not found." });

        emp.Department = dept.Name;
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

        var emp = await _context.Employees.FindAsync(employeeId);
        if (emp == null)
            return NotFound(new { message = "Employee not found." });

        if (string.Equals(emp.Department, dept.Name, StringComparison.OrdinalIgnoreCase))
        {
            emp.Department = null;
        }

        if (string.Equals(dept.Lead, emp.Name, StringComparison.OrdinalIgnoreCase))
        {
            dept.Lead = null;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
