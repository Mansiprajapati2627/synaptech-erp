// Models/ProjectTask.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynaptechERP.API.Models;

public class ProjectTask
{
    public int Id { get; set; }

    public int? ProjectId { get; set; }

    public string? ProjectName { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool Done { get; set; } = false;

    public string? AssignedTo { get; set; }

    public int? AssignedToEmployeeId { get; set; }

    public string? DueDate { get; set; }

    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    [MaxLength(50)]
    public string Status { get; set; } = "To do";

    // JSON text for comments array
    public string? Comments { get; set; }

    // JSON text for subtasks array
    public string? Subtasks { get; set; }

    // JSON text for attachments array
    public string? Attachments { get; set; }

    // JSON text for activity log array
    public string? Activity { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
