namespace Andacryx.Application.Models;

public sealed record FlowNodeDto(string Id, string Type, string Label, string Code, int StartLine, int EndLine);

public sealed record FlowEdgeDto(string Id, string Source, string Target, string? Label);

public sealed record MethodFlowDto(string Name, int StartLine, int EndLine, List<FlowNodeDto> Nodes, List<FlowEdgeDto> Edges);

public sealed record FlowAnalysisResult(string FileName, List<MethodFlowDto> Methods);