using Andacryx.Application.Interfaces;
using Andacryx.Application.Models;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Andacryx.Infrastructure.Analysis;

public sealed class RoslynCodeAnalyzer : ICodeAnalyzer
{
    public CodeAnalysisResult Analyze(
        string fileName,
        string sourceCode)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(sourceCode);
        var root = syntaxTree.GetRoot();

        var classes = root
            .DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .Select(classNode =>
            {
                var methods = classNode.Members
                    .OfType<MethodDeclarationSyntax>()
                    .Select(method =>
                    {
                        var lineSpan = method.GetLocation()
                            .GetLineSpan();

                        return new MethodInfoDto(
                            method.Identifier.Text,
                            lineSpan.StartLinePosition.Line + 1,
                            lineSpan.EndLinePosition.Line + 1
                        );
                    })
                    .ToList();

                return new ClassInfoDto(
                    classNode.Identifier.Text,
                    methods
                );
            })
            .ToList();

        return new CodeAnalysisResult(fileName, classes);
    }
}