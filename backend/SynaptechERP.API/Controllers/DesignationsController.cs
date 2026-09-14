// Controllers/DesignationsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DesignationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DesignationsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterItemDto>>> GetDesignations()
    {
        var items = await _context.Designations
            .OrderBy(d => d.Name)
            .Select(d => new MasterItemDto
            {
                Id = d.Id,
                Name = d.Name,
                Code = d.Code,
                Description = d.Description,
                Status = d.Status,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MasterItemDto>> GetDesignation(int id)
    {
        var d = await _context.Designations.FindAsync(id);
        if (d == null) return NotFound();

        return Ok(new MasterItemDto
        {
            Id = d.Id,
            Name = d.Name,
            Code = d.Code,
            Description = d.Description,
            Status = d.Status,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<MasterItemDto>> CreateDesignation([FromBody] CreateMasterItemDto dto)
    {
        if (await _context.Designations.AnyAsync(d => d.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Designation with this name already exists." });

        var designation = new Designation
        {
            Name = dto.Name.Trim(),
            Code = dto.Code?.Trim(),
            Description = dto.Description?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Designations.Add(designation);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDesignation), new { id = designation.Id }, new MasterItemDto
        {
            Id = designation.Id,
            Name = designation.Name,
            Code = designation.Code,
            Description = designation.Description,
            Status = designation.Status,
            CreatedAt = designation.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDesignation(int id, [FromBody] CreateMasterItemDto dto)
    {
        var designation = await _context.Designations.FindAsync(id);
        if (designation == null) return NotFound();

        if (await _context.Designations.AnyAsync(d => d.Id != id && d.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Another designation with this name already exists." });

        designation.Name = dto.Name.Trim();
        designation.Code = dto.Code?.Trim();
        designation.Description = dto.Description?.Trim();
        designation.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        designation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDesignation(int id)
    {
        var designation = await _context.Designations.FindAsync(id);
        if (designation == null) return NotFound();

        _context.Designations.Remove(designation);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
