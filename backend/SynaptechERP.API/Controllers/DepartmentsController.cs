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

        var deptDesignations = await _context.DepartmentDesignations
            .Include(dd => dd.Designation)
            .ToListAsync();

        var employees = await _context.Employees
            .Include(e => e.DepartmentEntity)
            .Include(e => e.DesignationEntity)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var nonAdminEmployees = employees
            .Where(e => (e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name ?? "Employee").ToLower() != "admin")
            .Select(e => new
            {
                e.Id,
                e.Name,
                DepartmentId = e.Employment?.DepartmentId ?? e.DepartmentId,
                Role = EmployeesController.ResolveSystemRole(e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name),
                Designation = e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name ?? string.Empty,
                e.Email,
                e.PhotoUrl,
                DepartmentName = e.Employment?.Department?.Name ?? e.DepartmentEntity?.Name ?? string.Empty
            })
            .ToList();

        var result = departments.Select(d =>
        {
            var members = nonAdminEmployees
                .Where(e => (e.DepartmentId.HasValue && e.DepartmentId.Value == d.Id) ||
                            (!string.IsNullOrWhiteSpace(e.DepartmentName) && string.Equals(e.DepartmentName, d.Name, StringComparison.OrdinalIgnoreCase)))
                .Select(e => new DepartmentMemberDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Role = e.Role,
                    Designation = e.Designation,
                    Email = e.Email,
                    PhotoUrl = e.PhotoUrl
                })
                .ToList();

            var linkedDesignations = deptDesignations
                .Where(dd => dd.DepartmentId == d.Id && dd.Designation != null)
                .Select(dd => new MasterItemDto
                {
                    Id = dd.Designation!.Id,
                    Name = dd.Designation.Name,
                    Code = dd.Designation.Code,
                    Description = dd.Designation.Description,
                    Status = dd.Designation.Status,
                    CreatedAt = dd.Designation.CreatedAt,
                    UpdatedAt = dd.Designation.UpdatedAt
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
                Designations = linkedDesignations,
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
            .Include(e => e.DepartmentEntity)
            .Include(e => e.DesignationEntity)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment)
                .ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name ?? "Employee").ToLower() != "admin" &&
                        ((e.Employment?.DepartmentId == d.Id || e.DepartmentId == d.Id) ||
                         string.Equals(e.Employment?.Department?.Name ?? e.DepartmentEntity?.Name, d.Name, StringComparison.OrdinalIgnoreCase)))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = EmployeesController.ResolveSystemRole(e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name),
                Designation = e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name,
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
                .FirstOrDefaultAsync(e => (e.Id == dept.ManagerId && dept.ManagerId.HasValue) || 
                                          (e.FirstName + " " + e.LastName).ToLower() == dept.Lead.ToLower() ||
                                          e.Email.ToLower() == dept.Lead.ToLower());

            if (leadEmp != null)
            {
                dept.ManagerId = leadEmp.Id;
                dept.Lead = leadEmp.Name;
                leadEmp.DepartmentId = dept.Id;
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
            .Include(e => e.DepartmentEntity)
            .Include(e => e.DesignationEntity)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name ?? "Employee").ToLower() != "admin" &&
                        ((e.Employment?.DepartmentId == dept.Id || e.DepartmentId == dept.Id) ||
                         string.Equals(e.Employment?.Department?.Name ?? e.DepartmentEntity?.Name, dept.Name, StringComparison.OrdinalIgnoreCase)))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = EmployeesController.ResolveSystemRole(e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name),
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

        if (!string.IsNullOrWhiteSpace(dept.Lead))
        {
            var leadEmp = await _context.Employees
                .Include(e => e.Employment)
                .FirstOrDefaultAsync(e => (e.Id == dept.ManagerId && dept.ManagerId.HasValue) || 
                                          (e.FirstName + " " + e.LastName).ToLower() == dept.Lead.ToLower() ||
                                          e.Email.ToLower() == dept.Lead.ToLower());

            if (leadEmp != null)
            {
                dept.ManagerId = leadEmp.Id;
                dept.Lead = leadEmp.Name;
                leadEmp.DepartmentId = dept.Id;
                if (leadEmp.Employment == null)
                {
                    leadEmp.Employment = new EmployeeEmployment { EmployeeId = leadEmp.Id, DepartmentId = dept.Id };
                    _context.EmployeeEmployments.Add(leadEmp.Employment);
                }
                else
                {
                    leadEmp.Employment.DepartmentId = dept.Id;
                }
            }
        }

        await _context.SaveChangesAsync();

        var employees = await _context.Employees
            .Include(e => e.DepartmentEntity)
            .Include(e => e.DesignationEntity)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee!.Designation)
            .ToListAsync();

        var members = employees
            .Where(e => (e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name ?? "Employee").ToLower() != "admin" &&
                        ((e.Employment?.DepartmentId == dept.Id || e.DepartmentId == dept.Id) ||
                         string.Equals(e.Employment?.Department?.Name ?? e.DepartmentEntity?.Name, dept.Name, StringComparison.OrdinalIgnoreCase)))
            .Select(e => new DepartmentMemberDto
            {
                Id = e.Id,
                Name = e.Name,
                Role = EmployeesController.ResolveSystemRole(e.Employment?.Designation?.Name ?? e.DesignationEntity?.Name),
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

    // GET: api/departments/department-designations
    [HttpGet("department-designations")]
    public async Task<ActionResult<IEnumerable<DepartmentDesignationDto>>> GetDepartmentDesignations()
    {
        var list = await _context.DepartmentDesignations
            .Include(dd => dd.Department)
            .Include(dd => dd.Designation)
            .OrderBy(dd => dd.DepartmentId)
            .ThenBy(dd => dd.DesignationId)
            .Select(dd => new DepartmentDesignationDto
            {
                DepartmentId = dd.DepartmentId,
                DepartmentName = dd.Department != null ? dd.Department.Name : string.Empty,
                DesignationId = dd.DesignationId,
                DesignationName = dd.Designation != null ? dd.Designation.Name : string.Empty
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET: api/departments/{id}/designations
    [HttpGet("{id:int}/designations")]
    public async Task<ActionResult<IEnumerable<MasterItemDto>>> GetDepartmentDesignationsByDeptId(int id)
    {
        var designations = await _context.DepartmentDesignations
            .Where(dd => dd.DepartmentId == id)
            .Include(dd => dd.Designation)
            .Select(dd => dd.Designation)
            .Where(d => d != null)
            .Select(d => new MasterItemDto
            {
                Id = d!.Id,
                Name = d.Name,
                Code = d.Code,
                Description = d.Description,
                Status = d.Status,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync();

        return Ok(designations);
    }

    // POST: api/departments/{departmentId}/designations/{designationId}
    [HttpPost("{departmentId:int}/designations/{designationId:int}")]
    public async Task<IActionResult> AddDesignationToDepartment(int departmentId, int designationId)
    {
        var dept = await _context.Departments.FindAsync(departmentId);
        if (dept == null) return NotFound(new { message = "Department not found." });

        var desig = await _context.Designations.FindAsync(designationId);
        if (desig == null) return NotFound(new { message = "Designation not found." });

        var exists = await _context.DepartmentDesignations
            .AnyAsync(dd => dd.DepartmentId == departmentId && dd.DesignationId == designationId);

        if (!exists)
        {
            _context.DepartmentDesignations.Add(new DepartmentDesignation
            {
                DepartmentId = departmentId,
                DesignationId = designationId
            });
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = $"Mapped designation '{desig.Name}' to department '{dept.Name}'." });
    }

    // DELETE: api/departments/{departmentId}/designations/{designationId}
    [HttpDelete("{departmentId:int}/designations/{designationId:int}")]
    public async Task<IActionResult> RemoveDesignationFromDepartment(int departmentId, int designationId)
    {
        var link = await _context.DepartmentDesignations
            .FirstOrDefaultAsync(dd => dd.DepartmentId == departmentId && dd.DesignationId == designationId);

        if (link != null)
        {
            _context.DepartmentDesignations.Remove(link);
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }
}
