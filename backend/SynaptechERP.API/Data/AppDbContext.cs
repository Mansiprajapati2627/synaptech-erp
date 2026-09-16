// Data/AppDbContext.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Data;

public class AppUser : IdentityUser
{
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
}

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<Designation> Designations { get; set; }
    public DbSet<EmploymentType> EmploymentTypes { get; set; }
    public DbSet<EmploymentStatus> EmploymentStatuses { get; set; }
    public DbSet<LeaveRequest> LeaveRequests { get; set; }
    public DbSet<Shift> Shifts { get; set; }
    public DbSet<EmployeeEmployment> EmployeeEmployments { get; set; }
    public DbSet<EmployeeDocument> EmployeeDocuments { get; set; }
    public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationMember> ConversationMembers { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectTask> Tasks { get; set; }
    public DbSet<PayrollRecord> PayrollRecords { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Conversation Mapping
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("Conversations");
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(c => c.UpdatedAt).HasDefaultValueSql("NOW()");
            entity.Property(c => c.LastMessageAt).HasDefaultValueSql("NOW()");
        });

        // ConversationMember Mapping
        modelBuilder.Entity<ConversationMember>(entity =>
        {
            entity.ToTable("ConversationMembers");
            entity.HasIndex(m => new { m.ConversationId, m.UserId }).IsUnique();
            entity.Property(m => m.JoinedAt).HasDefaultValueSql("NOW()");
            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Members)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Message Mapping
        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("Messages");
            entity.Property(m => m.SentAt).HasDefaultValueSql("NOW()");
            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Employee → AspNetUsers (UserId)
        modelBuilder.Entity<Employee>()
            .HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Employee Unique Email & EmployeeCode
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Department Mapping
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(d => d.Name).IsUnique();
            entity.HasIndex(d => d.Code).IsUnique();
            entity.Property(d => d.CreatedAt).HasDefaultValueSql("NOW()");
            entity.HasOne<Employee>()
                .WithMany()
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Designation Mapping
        modelBuilder.Entity<Designation>(entity =>
        {
            entity.HasIndex(d => d.Name).IsUnique();
            entity.HasIndex(d => d.Code).IsUnique();
            entity.Property(d => d.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // EmploymentType Mapping
        modelBuilder.Entity<EmploymentType>(entity =>
        {
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // EmploymentStatus Mapping
        modelBuilder.Entity<EmploymentStatus>(entity =>
        {
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Shift Mapping
        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasIndex(s => s.Name).IsUnique();
            entity.HasIndex(s => s.Code).IsUnique();
            entity.Property(s => s.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // EmployeeEmployment Relational Mapping
        modelBuilder.Entity<EmployeeEmployment>(entity =>
        {
            entity.HasIndex(ee => ee.EmployeeId).IsUnique();
            entity.Property(ee => ee.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(ee => ee.Employee)
                .WithOne(e => e.Employment)
                .HasForeignKey<EmployeeEmployment>(ee => ee.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ee => ee.Department)
                .WithMany()
                .HasForeignKey(ee => ee.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ee => ee.Designation)
                .WithMany()
                .HasForeignKey(ee => ee.DesignationId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ee => ee.ReportingManager)
                .WithMany()
                .HasForeignKey(ee => ee.ReportingManagerId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ee => ee.EmploymentType)
                .WithMany()
                .HasForeignKey(ee => ee.EmploymentTypeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ee => ee.EmploymentStatus)
                .WithMany()
                .HasForeignKey(ee => ee.EmploymentStatusId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ee => ee.Shift)
                .WithMany()
                .HasForeignKey(ee => ee.ShiftId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // AttendanceRecord Mapping
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(a => a.Employee)
                .WithMany()
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // EmployeeDocument Mapping
        modelBuilder.Entity<EmployeeDocument>(entity =>
        {
            entity.Property(ed => ed.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(ed => ed.Employee)
                .WithMany(e => e.Documents)
                .HasForeignKey(ed => ed.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}