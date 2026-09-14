// Controllers/EmployeeDocumentsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api")]
public class EmployeeDocumentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeeDocumentsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/employees/{employeeId}/documents
    [HttpGet("employees/{employeeId}/documents")]
    public async Task<ActionResult<IEnumerable<EmployeeDocumentDto>>> GetEmployeeDocuments(int employeeId)
    {
        var employeeExists = await _context.Employees.AnyAsync(e => e.Id == employeeId);
        if (!employeeExists)
        {
            return NotFound(new { message = $"Employee with ID {employeeId} not found." });
        }

        var documents = await _context.EmployeeDocuments
            .Include(d => d.Employee)
            .Where(d => d.EmployeeId == employeeId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new EmployeeDocumentDto
            {
                Id = d.Id,
                EmployeeId = d.EmployeeId,
                EmployeeName = d.Employee != null ? $"{d.Employee.FirstName} {d.Employee.LastName}".Trim() : null,
                DocumentName = d.DocumentName,
                DocumentType = d.DocumentType,
                DocumentNumber = d.DocumentNumber,
                FileUrl = d.FileUrl,
                FileName = d.FileName,
                FileSize = d.FileSize,
                ContentType = d.ContentType,
                Status = d.Status,
                IssueDate = d.IssueDate,
                ExpiryDate = d.ExpiryDate,
                Notes = d.Notes,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync();

        return Ok(documents);
    }

    // GET: api/employeedocuments/{id}
    [HttpGet("employeedocuments/{id}")]
    public async Task<ActionResult<EmployeeDocumentDto>> GetDocument(int id)
    {
        var doc = await _context.EmployeeDocuments
            .Include(d => d.Employee)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }

        return Ok(new EmployeeDocumentDto
        {
            Id = doc.Id,
            EmployeeId = doc.EmployeeId,
            EmployeeName = doc.Employee != null ? $"{doc.Employee.FirstName} {doc.Employee.LastName}".Trim() : null,
            DocumentName = doc.DocumentName,
            DocumentType = doc.DocumentType,
            DocumentNumber = doc.DocumentNumber,
            FileUrl = doc.FileUrl,
            FileName = doc.FileName,
            FileSize = doc.FileSize,
            ContentType = doc.ContentType,
            Status = doc.Status,
            IssueDate = doc.IssueDate,
            ExpiryDate = doc.ExpiryDate,
            Notes = doc.Notes,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt
        });
    }

    // POST: api/employees/{employeeId}/documents
    [HttpPost("employees/{employeeId}/documents")]
    public async Task<ActionResult<EmployeeDocumentDto>> CreateDocument(int employeeId, [FromBody] EmployeeDocumentCreateDto dto)
    {
        var employee = await _context.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = $"Employee with ID {employeeId} not found." });
        }

        var doc = new EmployeeDocument
        {
            EmployeeId = employeeId,
            DocumentName = dto.DocumentName,
            DocumentType = dto.DocumentType,
            DocumentNumber = dto.DocumentNumber,
            FileUrl = dto.FileUrl,
            FileName = dto.FileName,
            FileSize = dto.FileSize,
            ContentType = dto.ContentType,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status,
            IssueDate = dto.IssueDate,
            ExpiryDate = dto.ExpiryDate,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.EmployeeDocuments.Add(doc);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, new EmployeeDocumentDto
        {
            Id = doc.Id,
            EmployeeId = doc.EmployeeId,
            EmployeeName = $"{employee.FirstName} {employee.LastName}".Trim(),
            DocumentName = doc.DocumentName,
            DocumentType = doc.DocumentType,
            DocumentNumber = doc.DocumentNumber,
            FileUrl = doc.FileUrl,
            FileName = doc.FileName,
            FileSize = doc.FileSize,
            ContentType = doc.ContentType,
            Status = doc.Status,
            IssueDate = doc.IssueDate,
            ExpiryDate = doc.ExpiryDate,
            Notes = doc.Notes,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt
        });
    }

    // PUT: api/employeedocuments/{id}
    [HttpPut("employeedocuments/{id}")]
    public async Task<IActionResult> UpdateDocument(int id, [FromBody] EmployeeDocumentUpdateDto dto)
    {
        var doc = await _context.EmployeeDocuments.FindAsync(id);
        if (doc == null)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }

        doc.DocumentName = dto.DocumentName;
        doc.DocumentType = dto.DocumentType;
        doc.DocumentNumber = dto.DocumentNumber;
        if (!string.IsNullOrWhiteSpace(dto.FileUrl))
        {
            doc.FileUrl = dto.FileUrl;
        }
        doc.FileName = dto.FileName ?? doc.FileName;
        doc.FileSize = dto.FileSize ?? doc.FileSize;
        doc.ContentType = dto.ContentType ?? doc.ContentType;
        doc.Status = string.IsNullOrWhiteSpace(dto.Status) ? doc.Status : dto.Status;
        doc.IssueDate = dto.IssueDate;
        doc.ExpiryDate = dto.ExpiryDate;
        doc.Notes = dto.Notes;
        doc.UpdatedAt = DateTime.UtcNow;

        _context.Entry(doc).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Document updated successfully.", id = doc.Id });
    }

    // DELETE: api/employeedocuments/{id}
    [HttpDelete("employeedocuments/{id}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var doc = await _context.EmployeeDocuments.FindAsync(id);
        if (doc == null)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }

        _context.EmployeeDocuments.Remove(doc);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Document deleted successfully." });
    }
}
