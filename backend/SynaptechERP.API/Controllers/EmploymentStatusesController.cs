// Controllers/EmploymentStatusesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmploymentStatusesController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmploymentStatusesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterItemDto>>> GetEmploymentStatuses()
    {
        var items = await _context.EmploymentStatuses
            .OrderBy(e => e.Name)
            .Select(e => new MasterItemDto
            {
                Id = e.Id,
                Name = e.Name,
                Code = e.Code,
                Description = e.Description,
                Status = e.Status,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MasterItemDto>> GetEmploymentStatus(int id)
    {
        var e = await _context.EmploymentStatuses.FindAsync(id);
        if (e == null) return NotFound();

        return Ok(new MasterItemDto
        {
            Id = e.Id,
            Name = e.Name,
            Code = e.Code,
            Description = e.Description,
            Status = e.Status,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<MasterItemDto>> CreateEmploymentStatus([FromBody] CreateMasterItemDto dto)
    {
        if (await _context.EmploymentStatuses.AnyAsync(e => e.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "EmploymentStatus with this name already exists." });

        var status = new EmploymentStatus
        {
            Name = dto.Name.Trim(),
            Code = dto.Code?.Trim(),
            Description = dto.Description?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.EmploymentStatuses.Add(status);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmploymentStatus), new { id = status.Id }, new MasterItemDto
        {
            Id = status.Id,
            Name = status.Name,
            Code = status.Code,
            Description = status.Description,
            Status = status.Status,
            CreatedAt = status.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmploymentStatus(int id, [FromBody] CreateMasterItemDto dto)
    {
        var status = await _context.EmploymentStatuses.FindAsync(id);
        if (status == null) return NotFound();

        if (await _context.EmploymentStatuses.AnyAsync(e => e.Id != id && e.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Another EmploymentStatus with this name already exists." });

        status.Name = dto.Name.Trim();
        status.Code = dto.Code?.Trim();
        status.Description = dto.Description?.Trim();
        status.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        status.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmploymentStatus(int id)
    {
        var status = await _context.EmploymentStatuses.FindAsync(id);
        if (status == null) return NotFound();

        _context.EmploymentStatuses.Remove(status);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
