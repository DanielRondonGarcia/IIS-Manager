using IisManagerApi;
using IisManagerApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using System.Reflection;
using Swashbuckle.AspNetCore.Annotations;

var builder = WebApplication.CreateBuilder(args);

// Register AuditContext (SQLite)
builder.Services.AddDbContext<AuditContext>(options =>
    options.UseSqlite("Data Source=audit.db"));

// Register IIS Service
builder.Services.AddScoped<IisService>();

// Add CORS
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"] ?? "*";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins",
        policy =>
        {
            if (allowedOrigins == "*")
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            }
            else
            {
                policy.WithOrigins(allowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries))
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            }
        });
});

// Add Swagger/OpenAPI support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.EnableAnnotations();
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "IIS Manager API", 
        Version = "v1",
        Description = "Una API minimalista para gestionar Sitios y Application Pools de IIS. Permite listar topología, reiniciar sitios y reciclar pools.",
        Contact = new OpenApiContact
        {
            Name = "Soporte Interno",
            Email = "soporte@actsis.com"
        }
    });

    // Set the comments path for the Swagger JSON and UI.
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Ensure Database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuditContext>();
    db.Database.EnsureCreated();
}

// Enable CORS
app.UseCors("AllowConfiguredOrigins");

// Enable Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "IIS Manager API v1");
    c.RoutePrefix = string.Empty; // Serve Swagger UI at root
});

// Get Topology (with optional filter)
app.MapGet("/api/iis", 
    [SwaggerOperation(Summary = "Listar topología de IIS", Description = "Obtiene un árbol de Sitios y Aplicaciones. Permite filtrar por nombre (búsqueda parcial).")]
    (IisService iis, [FromQuery] string? filter) =>
{
    try
    {
        var data = iis.GetTopology(filter);
        return Results.Ok(data);
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
})
.WithName("GetTopology")
.Produces(200)
.ProducesProblem(500);

// Get Application Pools
app.MapGet("/api/pools", 
    [SwaggerOperation(Summary = "Listar Application Pools", Description = "Obtiene la lista de todos los Application Pools con su estado y configuración.")]
    (IisService iis, [FromQuery] string? filter) =>
{
    try
    {
        var data = iis.GetApplicationPools(filter);
        return Results.Ok(data);
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
})
.WithName("GetAppPools")
.Produces(200)
.ProducesProblem(500);

// Restart Site
app.MapPost("/api/sites/{name}/restart", 
    [SwaggerOperation(Summary = "Reiniciar un Sitio Web", Description = "Reinicia (Stop/Start) un sitio web raíz de IIS dado su nombre exacto.")]
    (IisService iis, AuditContext db, HttpContext http, string name) =>
{
    try
    {
        iis.RestartSite(name);

        // Audit Log
        db.AuditLogs.Add(new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            Action = "RestartSite",
            Target = name,
            Details = "Site restarted successfully",
            ClientIp = http.Connection.RemoteIpAddress?.ToString()
        });
        db.SaveChanges();

        return Results.Ok(new { Message = $"Site '{name}' restarted successfully." });
    }
    catch (KeyNotFoundException ex)
    {
        return Results.NotFound(new { Error = ex.Message });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
})
.WithName("RestartSite")
.Produces(200)
.Produces(404)
.ProducesProblem(500);

// Recycle App Pool
app.MapPost("/api/pools/{name}/recycle", 
    [SwaggerOperation(Summary = "Reciclar un Application Pool", Description = "Recicla un Application Pool específico. Útil para reiniciar subsitios o aplicaciones aisladas.")]
    (IisService iis, AuditContext db, HttpContext http, string name) =>
{
    try
    {
        iis.RecycleAppPool(name);

        // Audit Log
        db.AuditLogs.Add(new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            Action = "RecycleAppPool",
            Target = name,
            Details = "App Pool recycled successfully",
            ClientIp = http.Connection.RemoteIpAddress?.ToString()
        });
        db.SaveChanges();

        return Results.Ok(new { Message = $"Application Pool '{name}' recycled successfully." });
    }
    catch (KeyNotFoundException ex)
    {
        return Results.NotFound(new { Error = ex.Message });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
})
.WithName("RecycleAppPool")
.Produces(200)
.Produces(404)
.ProducesProblem(500);

// Get Audit Logs
app.MapGet("/api/audit",
    [SwaggerOperation(Summary = "Ver Auditoría de Ejecuciones", Description = "Obtiene el historial de reinicios y reciclajes. Permite filtrar por acción, objetivo y rango de fechas.")]
    (AuditContext db, 
     [SwaggerParameter("Filtra por tipo de acción (ej: RestartSite, RecycleAppPool). Coincidencia parcial.")] [FromQuery] string? action, 
     [SwaggerParameter("Filtra por nombre del sitio o pool afectado. Coincidencia parcial.")] [FromQuery] string? target, 
     [SwaggerParameter("Fecha inicio (UTC).")] [FromQuery] DateTime? dateFrom, 
     [SwaggerParameter("Fecha fin (UTC).")] [FromQuery] DateTime? dateTo, 
     [SwaggerParameter("Límite de resultados a devolver (por defecto 50).")] [FromQuery] int limit = 50) =>
{
    var query = db.AuditLogs.AsQueryable();

    if (!string.IsNullOrEmpty(action))
    {
        query = query.Where(l => l.Action.ToLower().Contains(action.ToLower()));
    }

    if (!string.IsNullOrEmpty(target))
    {
        query = query.Where(l => l.Target.ToLower().Contains(target.ToLower()));
    }

    if (dateFrom.HasValue)
    {
        query = query.Where(l => l.Timestamp >= dateFrom.Value);
    }

    if (dateTo.HasValue)
    {
        query = query.Where(l => l.Timestamp <= dateTo.Value);
    }

    var logs = query
        .OrderByDescending(l => l.Timestamp)
        .Take(limit)
        .ToList();
        
    return Results.Ok(logs);
})
.WithName("GetAuditLogs")
.Produces(200);

app.Run();
