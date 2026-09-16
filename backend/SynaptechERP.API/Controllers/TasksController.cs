// Controllers/TasksController.cs
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
public class TasksController : ControllerBase
{
    private readonly AppDbContext _context;

    public TasksController(AppDbContext context)
    {
        _context = context;
    }

    // GET: /api/Tasks
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectTaskDto>>> GetTasks([FromQuery] int? projectId, [FromQuery] string? assignedTo)
    {
        var query = _context.Tasks.AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        if (!string.IsNullOrWhiteSpace(assignedTo))
        {
            var term = assignedTo.Trim().ToLower();
            query = query.Where(t => t.AssignedTo != null && t.AssignedTo.ToLower().Contains(term));
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tasks.Select(MapToDto));
    }

    // GET: /api/Tasks/my-tasks
    [HttpGet("my-tasks")]
    public async Task<ActionResult<IEnumerable<ProjectTaskDto>>> GetMyTasks()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId || (userEmail != null && e.Email.ToLower() == userEmail));

        var query = _context.Tasks.AsQueryable();

        if (employee != null)
        {
            var empName = employee.Name.Trim().ToLower();
            var empEmail = employee.Email.Trim().ToLower();

            query = query.Where(t =>
                t.AssignedToEmployeeId == employee.Id ||
                (t.AssignedTo != null && (t.AssignedTo.ToLower().Contains(empName) || t.AssignedTo.ToLower().Contains(empEmail)))
            );
        }
        else if (!string.IsNullOrEmpty(userEmail))
        {
            query = query.Where(t => t.AssignedTo != null && t.AssignedTo.ToLower().Contains(userEmail));
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tasks.Select(MapToDto));
    }

    // GET: /api/Tasks/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectTaskDto>> GetTask(int id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found." });

        return Ok(MapToDto(task));
    }

    // POST: /api/Tasks
    [HttpPost]
    public async Task<ActionResult<ProjectTaskDto>> CreateTask([FromBody] CreateProjectTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Task title is required." });

        string? projName = dto.ProjectName;
        if (dto.ProjectId.HasValue)
        {
            var project = await _context.Projects.FindAsync(dto.ProjectId.Value);
            if (project != null)
            {
                projName = project.Name;
            }
        }

        var task = new ProjectTask
        {
            ProjectId = dto.ProjectId,
            ProjectName = projName,
            Title = dto.Title.Trim(),
            Description = dto.Description,
            Done = dto.Done,
            AssignedTo = dto.AssignedTo,
            AssignedToEmployeeId = dto.AssignedToEmployeeId,
            DueDate = dto.DueDate,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "To do" : dto.Status,
            CreatedAt = DateTime.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, MapToDto(task));
    }

    // PUT: /api/Tasks/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] CreateProjectTaskDto dto)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found." });

        if (!string.IsNullOrWhiteSpace(dto.Title))
            task.Title = dto.Title.Trim();

        task.Description = dto.Description;
        task.Done = dto.Done;
        if (dto.ProjectId.HasValue) task.ProjectId = dto.ProjectId;
        if (!string.IsNullOrWhiteSpace(dto.ProjectName)) task.ProjectName = dto.ProjectName;
        if (!string.IsNullOrWhiteSpace(dto.AssignedTo)) task.AssignedTo = dto.AssignedTo;
        if (dto.AssignedToEmployeeId.HasValue) task.AssignedToEmployeeId = dto.AssignedToEmployeeId;
        task.DueDate = dto.DueDate;
        if (!string.IsNullOrWhiteSpace(dto.Priority)) task.Priority = dto.Priority;
        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            task.Status = dto.Status;
            task.Done = dto.Status.Equals("Done", StringComparison.OrdinalIgnoreCase);
        }
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(task));
    }

    // DELETE: /api/Tasks/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found." });

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Task deleted successfully." });
    }

    private static ProjectTaskDto MapToDto(ProjectTask t)
    {
        return new ProjectTaskDto
        {
            Id = t.Id,
            ProjectId = t.ProjectId,
            ProjectName = t.ProjectName,
            Title = t.Title,
            Description = t.Description,
            Done = t.Done,
            AssignedTo = t.AssignedTo,
            AssignedToEmployeeId = t.AssignedToEmployeeId,
            DueDate = t.DueDate,
            Priority = t.Priority,
            Status = t.Status,
            CreatedAt = t.CreatedAt
        };
    }
}
