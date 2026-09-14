// Controllers/WorkLocationsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkLocationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public WorkLocationsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkLocationDto>>> GetWorkLocations()
    {
        var items = await _context.WorkLocations
            .OrderBy(w => w.Name)
            .Select(w => new WorkLocationDto
            {
                Id = w.Id,
                Name = w.Name,
                Code = w.Code,
                Description = w.Description,
                Address = w.Address,
                City = w.City,
                State = w.State,
                Country = w.Country,
                PostalCode = w.PostalCode,
                Status = w.Status,
                CreatedAt = w.CreatedAt,
                UpdatedAt = w.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WorkLocationDto>> GetWorkLocation(int id)
    {
        var w = await _context.WorkLocations.FindAsync(id);
        if (w == null) return NotFound();

        return Ok(new WorkLocationDto
        {
            Id = w.Id,
            Name = w.Name,
            Code = w.Code,
            Description = w.Description,
            Address = w.Address,
            City = w.City,
            State = w.State,
            Country = w.Country,
            PostalCode = w.PostalCode,
            Status = w.Status,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<WorkLocationDto>> CreateWorkLocation([FromBody] CreateWorkLocationDto dto)
    {
        if (await _context.WorkLocations.AnyAsync(w => w.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "WorkLocation with this name already exists." });

        var location = new WorkLocation
        {
            Name = dto.Name.Trim(),
            Code = dto.Code?.Trim(),
            Description = dto.Description?.Trim(),
            Address = dto.Address?.Trim(),
            City = dto.City?.Trim(),
            State = dto.State?.Trim(),
            Country = dto.Country?.Trim(),
            PostalCode = dto.PostalCode?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.WorkLocations.Add(location);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetWorkLocation), new { id = location.Id }, new WorkLocationDto
        {
            Id = location.Id,
            Name = location.Name,
            Code = location.Code,
            Description = location.Description,
            Address = location.Address,
            City = location.City,
            State = location.State,
            Country = location.Country,
            PostalCode = location.PostalCode,
            Status = location.Status,
            CreatedAt = location.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWorkLocation(int id, [FromBody] CreateWorkLocationDto dto)
    {
        var location = await _context.WorkLocations.FindAsync(id);
        if (location == null) return NotFound();

        if (await _context.WorkLocations.AnyAsync(w => w.Id != id && w.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Another WorkLocation with this name already exists." });

        location.Name = dto.Name.Trim();
        location.Code = dto.Code?.Trim();
        location.Description = dto.Description?.Trim();
        location.Address = dto.Address?.Trim();
        location.City = dto.City?.Trim();
        location.State = dto.State?.Trim();
        location.Country = dto.Country?.Trim();
        location.PostalCode = dto.PostalCode?.Trim();
        location.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        location.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkLocation(int id)
    {
        var location = await _context.WorkLocations.FindAsync(id);
        if (location == null) return NotFound();

        _context.WorkLocations.Remove(location);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
