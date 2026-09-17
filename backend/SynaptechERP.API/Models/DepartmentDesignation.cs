// Models/DepartmentDesignation.cs
namespace SynaptechERP.API.Models;

public class DepartmentDesignation
{
    public int DepartmentId { get; set; }
    public Department? Department { get; set; }

    public int DesignationId { get; set; }
    public Designation? Designation { get; set; }
}
