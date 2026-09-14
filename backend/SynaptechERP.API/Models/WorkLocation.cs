// Models/WorkLocation.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class WorkLocation
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    [MaxLength(250)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? State { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(20)]
    public string? PostalCode { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
