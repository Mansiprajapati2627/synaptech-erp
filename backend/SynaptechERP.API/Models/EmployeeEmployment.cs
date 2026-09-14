// Models/EmployeeEmployment.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class EmployeeEmployment
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    public int? DepartmentId { get; set; }

    public int? DesignationId { get; set; }

    public int? ReportingManagerId { get; set; }

    public int? EmploymentTypeId { get; set; }

    public int? EmploymentStatusId { get; set; }

    public int? WorkLocationId { get; set; }

    public int? ShiftId { get; set; }

    public DateTime? JoinDate { get; set; }

    public DateTime? ConfirmationDate { get; set; }

    public DateTime? ProbationStartDate { get; set; }

    public DateTime? ProbationEndDate { get; set; }

    public int? NoticePeriodDays { get; set; }

    [MaxLength(50)]
    public string? WorkMode { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public Employee? Employee { get; set; }
    public Department? Department { get; set; }
    public Designation? Designation { get; set; }
    public Employee? ReportingManager { get; set; }
    public EmploymentType? EmploymentType { get; set; }
    public EmploymentStatus? EmploymentStatus { get; set; }
    public WorkLocation? WorkLocation { get; set; }
    public Shift? Shift { get; set; }
}
