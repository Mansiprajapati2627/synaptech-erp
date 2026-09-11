// Models/Department.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class Department
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Lead { get; set; }

    [MaxLength(30)]
    public string Color { get; set; } = "teal";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
