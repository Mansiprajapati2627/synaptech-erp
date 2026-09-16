// DTOs/ProjectDtos.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class ProjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Owner { get; set; }
    public string Status { get; set; } = "On track";
    public int Progress { get; set; } = 0;
    public string Color { get; set; } = "#6366f1";
    public string Priority { get; set; } = "Medium";
    public string? StartDate { get; set; }
    public string? Deadline { get; set; }
    public List<string> Members { get; set; } = new();
    public List<ProjectTaskDto> Tasks { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateProjectDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Owner { get; set; }
    public string Status { get; set; } = "On track";
    public int Progress { get; set; } = 0;
    public string Color { get; set; } = "#6366f1";
    public string Priority { get; set; } = "Medium";
    public string? StartDate { get; set; }
    public string? Deadline { get; set; }
    public List<string>? Members { get; set; }
}

public class ProjectTaskDto
{
    public int Id { get; set; }
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Done { get; set; } = false;
    public string? AssignedTo { get; set; }
    public int? AssignedToEmployeeId { get; set; }
    public string? DueDate { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "To do";
    public DateTime CreatedAt { get; set; }
}

public class CreateProjectTaskDto
{
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Done { get; set; } = false;
    public string? AssignedTo { get; set; }
    public int? AssignedToEmployeeId { get; set; }
    public string? DueDate { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "To do";
}
