using Andacryx.Application.Models;

namespace Andacryx.Application.Interfaces;

public interface ICodeAnalyzer
{
    CodeAnalysisResult Analyze(
        string fileName,
        string sourceCode
    );
}