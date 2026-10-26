
using Andacryx.Application.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Andacryx.Infrastructure.Analysis;

public sealed class RoslynFlowAnalyzer
{
    public FlowAnalysisResult Analyze(string fileName, string sourceCode)
    {
        var root = CSharpSyntaxTree.ParseText(sourceCode).GetRoot();

        var methods = root.DescendantNodes().OfType<MethodDeclarationSyntax>()
            .Select(BuildMethodFlow).ToList();

        return new FlowAnalysisResult(fileName, methods);
    }

    private static MethodFlowDto BuildMethodFlow(MethodDeclarationSyntax method)
    {
        var nodes = new List<FlowNodeDto>();
        var edges = new List<FlowEdgeDto>();
        var counter = 0;

        string AddNode(string type, string label, SyntaxNode syntax)
        {
            var id = $"node-{++counter}";
            var span = syntax.GetLocation().GetLineSpan();

            nodes.Add(new FlowNodeDto(
                id, type, label, syntax.ToString().Trim(),
                span.StartLinePosition.Line + 1,
                span.EndLinePosition.Line + 1
            ));

            return id;
        }

        void Connect(string source, string target, string? label = null)
        {
            edges.Add(new FlowEdgeDto($"edge-{edges.Count + 1}", source, target, label));
        }

        var start = AddNode("start", $"{method.Identifier.Text}()", method);
        var end = AddNode("end", "End", method);

        string BuildBlock(StatementSyntax statement, string next, string? breakTarget = null, string? continueTarget = null)
        {
            if (statement is BlockSyntax block)
            {
                foreach (var child in block.Statements.Reverse())
                    next = BuildBlock(child, next, breakTarget, continueTarget);

                return next;
            }

            if (statement is IfStatementSyntax ifStatement)
            {
                var condition = AddNode("condition", $"if ({ifStatement.Condition})", ifStatement.Condition);
                var trueStart = BuildBlock(ifStatement.Statement, next, breakTarget, continueTarget);
                var falseStart = ifStatement.Else is null
                    ? next
                    : BuildBlock(ifStatement.Else.Statement, next, breakTarget, continueTarget);

                Connect(condition, trueStart, "True");
                Connect(condition, falseStart, "False");

                return condition;
            }

            if (statement is ForStatementSyntax forStatement)
            {
                var loop = AddNode("loop", $"for ({forStatement.Condition?.ToString() ?? "true"})", forStatement);
                var bodyStart = BuildBlock(forStatement.Statement, loop, next, loop);

                Connect(loop, bodyStart, "True");

                if (forStatement.Condition is not null)
                    Connect(loop, next, "False");

                return loop;
            }

            if (statement is ForEachStatementSyntax foreachStatement)
            {
                var loop = AddNode("loop", $"foreach ({foreachStatement.Identifier} in {foreachStatement.Expression})", foreachStatement);
                var bodyStart = BuildBlock(foreachStatement.Statement, loop, next, loop);

                Connect(loop, bodyStart, "True");
                Connect(loop, next, "False");

                return loop;
            }

            if (statement is WhileStatementSyntax whileStatement)
            {
                var loop = AddNode("loop", $"while ({whileStatement.Condition})", whileStatement);
                var bodyStart = BuildBlock(whileStatement.Statement, loop, next, loop);

                Connect(loop, bodyStart, "True");
                Connect(loop, next, "False");

                return loop;
            }

            if (statement is DoStatementSyntax doStatement)
            {
                var loop = AddNode("loop", $"while ({doStatement.Condition})", doStatement.Condition);
                var bodyStart = BuildBlock(doStatement.Statement, loop, next, loop);

                Connect(loop, bodyStart, "True");
                Connect(loop, next, "False");

                return bodyStart;
            }

            if (statement is ReturnStatementSyntax returnStatement)
            {
                var node = AddNode("process", returnStatement.ToString(), returnStatement);
                Connect(node, end);
                return node;
            }

            if (statement is BreakStatementSyntax breakStatement)
            {
                var node = AddNode("process", "break", breakStatement);
                Connect(node, breakTarget ?? next);
                return node;
            }

            if (statement is ContinueStatementSyntax continueStatement)
            {
                var node = AddNode("process", "continue", continueStatement);
                Connect(node, continueTarget ?? next);
                return node;
            }

            var process = AddNode("process", statement.ToString(), statement);
            Connect(process, next);

            return process;
        }

        var first = end;

        if (method.Body is not null)
        {
            first = BuildBlock(method.Body, end);
        }
        else if (method.ExpressionBody is not null)
        {
            var expression = method.ExpressionBody.Expression;
            var node = AddNode("process", expression.ToString(), expression);

            Connect(node, end);
            first = node;
        }

        Connect(start, first);

        var span = method.GetLocation().GetLineSpan();

        return new MethodFlowDto(
            method.Identifier.Text,
            span.StartLinePosition.Line + 1,
            span.EndLinePosition.Line + 1,
            nodes,
            edges
        );
    }
}
