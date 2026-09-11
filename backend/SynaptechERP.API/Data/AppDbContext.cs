// Data/AppDbContext.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Data;

public class AppUser : IdentityUser
{
    // Additional user properties can be added here later
}

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<Department> Departments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Employee → Reporting Manager self-reference
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.ReportingManager)
            .WithMany(e => e.Subordinates)
            .HasForeignKey(e => e.ReportingManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Employee → AspNetUsers (UserId)
        modelBuilder.Entity<Employee>()
            .HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Unique email
        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.Email)
            .IsUnique();

        // CreatedAt default (PostgreSQL)
        modelBuilder.Entity<Employee>()
            .Property(e => e.CreatedAt)
            .HasDefaultValueSql("NOW()");

        // Department mapping
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(d => d.Name).IsUnique();
            entity.Property(d => d.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(d => d.Color).HasDefaultValue("teal");
        });
    }
}