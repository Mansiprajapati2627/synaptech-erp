using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynaptechERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBreakFieldsToAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BreakEnd",
                table: "AttendanceRecords",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BreakStart",
                table: "AttendanceRecords",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BreakTime",
                table: "AttendanceRecords",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BreakEnd",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "BreakStart",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "BreakTime",
                table: "AttendanceRecords");
        }
    }
}
