// Models/Department.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class Department
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    public int? ManagerId { get; set; }

    [MaxLength(100)]
    public string? Lead { get; set; }

    [MaxLength(30)]
    public string Color { get; set; } = "teal";

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation property for DepartmentDesignations joining table
    public ICollection<DepartmentDesignation> DepartmentDesignations { get; set; } = new List<DepartmentDesignation>();
}
