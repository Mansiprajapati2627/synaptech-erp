// Controllers/ProjectsController.cs
using System.Text.Json;
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
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProjectsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: /api/Projects
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects()
    {
        var projects = await _context.Projects.OrderByDescending(p => p.CreatedAt).ToListAsync();
        var projectIds = projects.Select(p => p.Id).ToList();
        var tasks = await _context.Tasks.Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)).ToListAsync();

        var result = projects.Select(p => MapToDto(p, tasks.Where(t => t.ProjectId == p.Id).ToList())).ToList();
        return Ok(result);
    }

    // GET: /api/Projects/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(int id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found." });

        var tasks = await _context.Tasks.Where(t => t.ProjectId == id).ToListAsync();
        return Ok(MapToDto(project, tasks));
    }

    // POST: /api/Projects
    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject([FromBody] CreateProjectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Project name is required." });

        var project = new Project
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            Owner = dto.Owner ?? User.Identity?.Name ?? "Admin",
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "On track" : dto.Status,
            Progress = dto.Progress,
            Color = string.IsNullOrWhiteSpace(dto.Color) ? "#6366f1" : dto.Color,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
            StartDate = dto.StartDate,
            Deadline = dto.Deadline,
            Members = dto.Members != null ? JsonSerializer.Serialize(dto.Members) : "[]",
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, MapToDto(project, new List<ProjectTask>()));
    }

    // PUT: /api/Projects/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] CreateProjectDto dto)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found." });

        if (!string.IsNullOrWhiteSpace(dto.Name))
            project.Name = dto.Name.Trim();

        project.Description = dto.Description;
        if (!string.IsNullOrWhiteSpace(dto.Owner)) project.Owner = dto.Owner;
        if (!string.IsNullOrWhiteSpace(dto.Status)) project.Status = dto.Status;
        project.Progress = dto.Progress;
        if (!string.IsNullOrWhiteSpace(dto.Color)) project.Color = dto.Color;
        if (!string.IsNullOrWhiteSpace(dto.Priority)) project.Priority = dto.Priority;
        project.StartDate = dto.StartDate;
        project.Deadline = dto.Deadline;
        if (dto.Members != null) project.Members = JsonSerializer.Serialize(dto.Members);
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var tasks = await _context.Tasks.Where(t => t.ProjectId == id).ToListAsync();
        return Ok(MapToDto(project, tasks));
    }

    // DELETE: /api/Projects/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found." });

        var tasks = await _context.Tasks.Where(t => t.ProjectId == id).ToListAsync();
        _context.Tasks.RemoveRange(tasks);
        _context.Projects.Remove(project);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Project and linked tasks deleted." });
    }

    // DELETE: /api/Projects/by-name/{name}
    [HttpDelete("by-name/{name}")]
    public async Task<IActionResult> DeleteProjectByName(string name)
    {
        var normName = name.Trim().ToLower();
        var projects = await _context.Projects.Where(p => p.Name.ToLower() == normName).ToListAsync();
        if (!projects.Any())
            return NotFound(new { message = "Project not found." });

        foreach (var p in projects)
        {
            var tasks = await _context.Tasks.Where(t => t.ProjectId == p.Id).ToListAsync();
            _context.Tasks.RemoveRange(tasks);
            _context.Projects.Remove(p);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Project deleted successfully." });
    }

    // DELETE: /api/Projects/purge-all
    [HttpDelete("purge-all")]
    public async Task<IActionResult> PurgeAllProjects()
    {
        var tasks = await _context.Tasks.ToListAsync();
        _context.Tasks.RemoveRange(tasks);
        var projects = await _context.Projects.ToListAsync();
        _context.Projects.RemoveRange(projects);
        await _context.SaveChangesAsync();
        return Ok(new { message = "All projects and tasks purged." });
    }

    private static ProjectDto MapToDto(Project p, List<ProjectTask> tasks)
    {
        List<string> membersList = new();
        if (!string.IsNullOrEmpty(p.Members))
        {
            try
            {
                membersList = JsonSerializer.Deserialize<List<string>>(p.Members) ?? new();
            }
            catch
            {
                membersList = new();
            }
        }

        return new ProjectDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            Owner = p.Owner,
            Status = p.Status,
            Progress = p.Progress,
            Color = p.Color,
            Priority = p.Priority,
            StartDate = p.StartDate,
            Deadline = p.Deadline,
            Members = membersList,
            CreatedAt = p.CreatedAt,
            Tasks = tasks.Select(t => new ProjectTaskDto
            {
                Id = t.Id,
                ProjectId = t.ProjectId,
                ProjectName = t.ProjectName ?? p.Name,
                Title = t.Title,
                Description = t.Description,
                Done = t.Done,
                AssignedTo = t.AssignedTo,
                AssignedToEmployeeId = t.AssignedToEmployeeId,
                DueDate = t.DueDate,
                Priority = t.Priority,
                Status = t.Status,
                CreatedAt = t.CreatedAt
            }).ToList()
        };
    }
}
