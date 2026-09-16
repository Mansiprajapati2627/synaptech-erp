// Models/Project.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynaptechERP.API.Models;

public class Project
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Owner { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "On track";

    public int Progress { get; set; } = 0;

    [MaxLength(50)]
    public string Color { get; set; } = "#6366f1";

    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    public string? StartDate { get; set; }

    public string? Deadline { get; set; }

    // JSON array of team member names or emails
    public string? Members { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
