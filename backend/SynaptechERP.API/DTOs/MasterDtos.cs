// DTOs/MasterDtos.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class MasterItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateMasterItemDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";
}

public class ShiftDto : MasterItemDto
{
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}

public class CreateShiftDto : CreateMasterItemDto
{
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}

public class EmployeeEmploymentDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int? DesignationId { get; set; }
    public string? DesignationName { get; set; }
    public int? ReportingManagerId { get; set; }
    public string? ReportingManagerName { get; set; }
    public int? EmploymentTypeId { get; set; }
    public string? EmploymentTypeName { get; set; }
    public int? EmploymentStatusId { get; set; }
    public string? EmploymentStatusName { get; set; }
    public int? ShiftId { get; set; }
    public string? ShiftName { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? ConfirmationDate { get; set; }
    public DateTime? ProbationStartDate { get; set; }
    public DateTime? ProbationEndDate { get; set; }
    public int? NoticePeriodDays { get; set; }
    public string? WorkMode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
