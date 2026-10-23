using Andacryx.Application.Interfaces;
using Andacryx.Infrastructure.Analysis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<ICodeAnalyzer, RoslynCodeAnalyzer>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("DevelopmentFrontend");

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "healthy",
        application = "Andacryx"
    });
});

app.MapPost("/api/analysis/upload",
    async (IFormFile file, ICodeAnalyzer analyzer) =>
    {
        if (!Path.GetExtension(file.FileName)
            .Equals(".cs", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new
            {
                error = "Only .cs files are supported."
            });
        }

        if (file.Length == 0 || file.Length > 1024 * 1024)
        {
            return Results.BadRequest(new
            {
                error = "File must be between 1 byte and 1 MB."
            });
        }

        using var reader = new StreamReader(file.OpenReadStream());

        var sourceCode = await reader.ReadToEndAsync();

        var result = analyzer.Analyze(
            Path.GetFileName(file.FileName),
            sourceCode
        );

        return Results.Ok(result);
    })
.DisableAntiforgery();

app.Run();