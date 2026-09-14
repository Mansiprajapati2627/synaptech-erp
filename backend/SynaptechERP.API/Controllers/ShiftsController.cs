// Controllers/ShiftsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShiftsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShiftsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShiftDto>>> GetShifts()
    {
        var items = await _context.Shifts
            .OrderBy(s => s.Name)
            .Select(s => new ShiftDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Description = s.Description,
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ShiftDto>> GetShift(int id)
    {
        var s = await _context.Shifts.FindAsync(id);
        if (s == null) return NotFound();

        return Ok(new ShiftDto
        {
            Id = s.Id,
            Name = s.Name,
            Code = s.Code,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            Description = s.Description,
            Status = s.Status,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<ShiftDto>> CreateShift([FromBody] CreateShiftDto dto)
    {
        if (await _context.Shifts.AnyAsync(s => s.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Shift with this name already exists." });

        var shift = new Shift
        {
            Name = dto.Name.Trim(),
            Code = dto.Code?.Trim(),
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Description = dto.Description?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Shifts.Add(shift);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetShift), new { id = shift.Id }, new ShiftDto
        {
            Id = shift.Id,
            Name = shift.Name,
            Code = shift.Code,
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            Description = shift.Description,
            Status = shift.Status,
            CreatedAt = shift.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateShift(int id, [FromBody] CreateShiftDto dto)
    {
        var shift = await _context.Shifts.FindAsync(id);
        if (shift == null) return NotFound();

        if (await _context.Shifts.AnyAsync(s => s.Id != id && s.Name.ToLower() == dto.Name.Trim().ToLower()))
            return BadRequest(new { message = "Another Shift with this name already exists." });

        shift.Name = dto.Name.Trim();
        shift.Code = dto.Code?.Trim();
        shift.StartTime = dto.StartTime;
        shift.EndTime = dto.EndTime;
        shift.Description = dto.Description?.Trim();
        shift.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        shift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShift(int id)
    {
        var shift = await _context.Shifts.FindAsync(id);
        if (shift == null) return NotFound();

        _context.Shifts.Remove(shift);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
