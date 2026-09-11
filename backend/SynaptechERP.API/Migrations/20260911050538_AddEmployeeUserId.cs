using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynaptechERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Employees",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Employees",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_UserId",
                table: "Employees",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_AspNetUsers_UserId",
                table: "Employees",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_AspNetUsers_UserId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_UserId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Employees");

            migrationBuilder.InsertData(
                table: "Employees",
                columns: new[] { "Id", "BirthDate", "CreatedAt", "Department", "Email", "JoinDate", "Name", "Phone", "PhotoUrl", "ReportingManagerId", "Role", "Status" },
                values: new object[] { 1, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "admin@synaptech.io", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Admin", null, null, null, "Admin", "Present" });
        }
    }
}
