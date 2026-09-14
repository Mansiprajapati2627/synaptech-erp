// Controllers/EmploymentTypesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmploymentTypesController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmploymentTypesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterItemDto>>> GetEmploymentTypes()
    {
        var items = await _context.EmploymentTypes
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
    public async Task<ActionResult<MasterItemDto>> GetEmploymentType(int id)
    {
        var e = await _context.EmploymentTypes.FindAsync(id);
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
    public async Task<ActionResult<MasterItemDto>> CreateEmploymentType([FromBody] CreateMasterItemDto dto)
    {
        if (await _context.EmploymentTypes.AnyAsync(e => e.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "EmploymentType with this name already exists." });

        var type = new EmploymentType
        {
            Name = dto.Name.Trim(),
            Code = dto.Code?.Trim(),
            Description = dto.Description?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.EmploymentTypes.Add(type);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmploymentType), new { id = type.Id }, new MasterItemDto
        {
            Id = type.Id,
            Name = type.Name,
            Code = type.Code,
            Description = type.Description,
            Status = type.Status,
            CreatedAt = type.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmploymentType(int id, [FromBody] CreateMasterItemDto dto)
    {
        var type = await _context.EmploymentTypes.FindAsync(id);
        if (type == null) return NotFound();

        if (await _context.EmploymentTypes.AnyAsync(e => e.Id != id && e.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Another EmploymentType with this name already exists." });

        type.Name = dto.Name.Trim();
        type.Code = dto.Code?.Trim();
        type.Description = dto.Description?.Trim();
        type.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        type.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmploymentType(int id)
    {
        var type = await _context.EmploymentTypes.FindAsync(id);
        if (type == null) return NotFound();

        _context.EmploymentTypes.Remove(type);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
