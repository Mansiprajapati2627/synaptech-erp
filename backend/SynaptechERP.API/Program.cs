// Program.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Controllers + OpenAPI
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// ASP.NET Core Identity
builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;

        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

// CORS for Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Pipeline
app.UseCors("AllowAngular");
app.UseAuthorization();
app.MapControllers();

// Seed admin Identity user & master data
using (var scope = app.Services.CreateScope())
{
    await DbInitializer.SeedAdminAsync(
        scope.ServiceProvider,
        builder.Configuration
    );

    await DbInitializer.SeedMasterDataAsync(
        scope.ServiceProvider
    );
}

app.Run();