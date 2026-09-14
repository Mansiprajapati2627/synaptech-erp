using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SynaptechERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterTablesAndEmployeeEmployment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_Employees_ReportingManagerId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_ReportingManagerId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "ReportingManagerId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Employees");

            migrationBuilder.RenameColumn(
                name: "JoinDate",
                table: "Employees",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "BirthDate",
                table: "Employees",
                newName: "DateOfBirth");

            migrationBuilder.AddColumn<string>(
                name: "AlternatePhone",
                table: "Employees",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeCode",
                table: "Employees",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "Employees",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Employees",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "Employees",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MiddleName",
                table: "Employees",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalEmail",
                table: "Employees",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Color",
                table: "Departments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "teal");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Departments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ManagerId",
                table: "Departments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Departments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Departments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Designations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Designations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmploymentStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmploymentStatuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmploymentTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmploymentTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Shifts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Address = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkLocations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeEmployments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EmployeeId = table.Column<int>(type: "integer", nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    DesignationId = table.Column<int>(type: "integer", nullable: true),
                    ReportingManagerId = table.Column<int>(type: "integer", nullable: true),
                    EmploymentTypeId = table.Column<int>(type: "integer", nullable: true),
                    EmploymentStatusId = table.Column<int>(type: "integer", nullable: true),
                    WorkLocationId = table.Column<int>(type: "integer", nullable: true),
                    ShiftId = table.Column<int>(type: "integer", nullable: true),
                    JoinDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProbationStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProbationEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NoticePeriodDays = table.Column<int>(type: "integer", nullable: true),
                    WorkMode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeEmployments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_Designations_DesignationId",
                        column: x => x.DesignationId,
                        principalTable: "Designations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_Employees_ReportingManagerId",
                        column: x => x.ReportingManagerId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_EmploymentStatuses_EmploymentStatusId",
                        column: x => x.EmploymentStatusId,
                        principalTable: "EmploymentStatuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_EmploymentTypes_EmploymentTypeId",
                        column: x => x.EmploymentTypeId,
                        principalTable: "EmploymentTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_EmployeeEmployments_WorkLocations_WorkLocationId",
                        column: x => x.WorkLocationId,
                        principalTable: "WorkLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_EmployeeCode",
                table: "Employees",
                column: "EmployeeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departments_Code",
                table: "Departments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departments_ManagerId",
                table: "Departments",
                column: "ManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_Designations_Code",
                table: "Designations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Designations_Name",
                table: "Designations",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_DepartmentId",
                table: "EmployeeEmployments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_DesignationId",
                table: "EmployeeEmployments",
                column: "DesignationId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_EmployeeId",
                table: "EmployeeEmployments",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_EmploymentStatusId",
                table: "EmployeeEmployments",
                column: "EmploymentStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_EmploymentTypeId",
                table: "EmployeeEmployments",
                column: "EmploymentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_ReportingManagerId",
                table: "EmployeeEmployments",
                column: "ReportingManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_ShiftId",
                table: "EmployeeEmployments",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmployments_WorkLocationId",
                table: "EmployeeEmployments",
                column: "WorkLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentStatuses_Code",
                table: "EmploymentStatuses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentStatuses_Name",
                table: "EmploymentStatuses",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentTypes_Code",
                table: "EmploymentTypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentTypes_Name",
                table: "EmploymentTypes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_Code",
                table: "Shifts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_Name",
                table: "Shifts",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkLocations_Code",
                table: "WorkLocations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkLocations_Name",
                table: "WorkLocations",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_Employees_ManagerId",
                table: "Departments",
                column: "ManagerId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Employees_ManagerId",
                table: "Departments");

            migrationBuilder.DropTable(
                name: "EmployeeEmployments");

            migrationBuilder.DropTable(
                name: "Designations");

            migrationBuilder.DropTable(
                name: "EmploymentStatuses");

            migrationBuilder.DropTable(
                name: "EmploymentTypes");

            migrationBuilder.DropTable(
                name: "Shifts");

            migrationBuilder.DropTable(
                name: "WorkLocations");

            migrationBuilder.DropIndex(
                name: "IX_Employees_EmployeeCode",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Departments_Code",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_ManagerId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "AlternatePhone",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "EmployeeCode",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "MiddleName",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PersonalEmail",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "ManagerId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Departments");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "Employees",
                newName: "JoinDate");

            migrationBuilder.RenameColumn(
                name: "DateOfBirth",
                table: "Employees",
                newName: "BirthDate");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Employees",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Employees",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ReportingManagerId",
                table: "Employees",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Employees",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Employees",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Color",
                table: "Departments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "teal",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_ReportingManagerId",
                table: "Employees",
                column: "ReportingManagerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_Employees_ReportingManagerId",
                table: "Employees",
                column: "ReportingManagerId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
