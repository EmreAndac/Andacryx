
using Andacryx.Application.Interfaces;
using Andacryx.Application.Models;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Andacryx.Infrastructure.Analysis;

public sealed class RoslynCodeAnalyzer : ICodeAnalyzer
{
    public CodeAnalysisResult Analyze(string fileName, string sourceCode)
    {
        var root = CSharpSyntaxTree.ParseText(sourceCode).GetRoot();

        var classes = root.DescendantNodes().OfType<ClassDeclarationSyntax>()
            .Select(classNode =>
            {
                var methods = classNode.Members.OfType<MethodDeclarationSyntax>()
                    .Select(method =>
                    {
                        var span = method.GetLocation().GetLineSpan();

                        return new MethodInfoDto(
                            method.Identifier.Text,
                            span.StartLinePosition.Line + 1,
                            span.EndLinePosition.Line + 1
                        );
                    }).ToList();

                return new ClassInfoDto(classNode.Identifier.Text, methods);
            }).ToList();

        return new CodeAnalysisResult(fileName, classes);
    }

    public FlowAnalysisResult AnalyzeFlow(string fileName, string sourceCode)
    {
        var flowAnalyzer = new RoslynFlowAnalyzer();
        return flowAnalyzer.Analyze(fileName, sourceCode);
    }
}
