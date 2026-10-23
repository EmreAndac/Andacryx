namespace Andacryx.Application.Models;

public sealed record MethodInfoDto(string Name, int StartLine, int EndLine);

public sealed record ClassInfoDto(string Name, List<MethodInfoDto> Methods);

public sealed record CodeAnalysisResult(string FileName, List<ClassInfoDto> Classes);