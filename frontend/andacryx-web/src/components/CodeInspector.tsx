import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

type Props = {
  code: string;
  startLine?: number;
  endLine?: number;
};

export default function CodeInspector({ code, startLine, endLine }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null,
  );

  const handleMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;
    decorationsRef.current = editorInstance.createDecorationsCollection();
  };

  useEffect(() => {
    const instance = editorRef.current;
    const monaco = monacoRef.current;
    const decorations = decorationsRef.current;

    if (!instance || !monaco || !decorations) return;

    if (!startLine || !endLine) {
      decorations.clear();
      return;
    }

    const model = instance.getModel();
    if (!model) return;

    const start = Math.max(1, Math.min(startLine, model.getLineCount()));
    const end = Math.max(start, Math.min(endLine, model.getLineCount()));

    decorations.set([
      {
        range: new monaco.Range(start, 1, end, model.getLineMaxColumn(end)),
        options: {
          isWholeLine: true,
          className: "inspector-highlight",
          linesDecorationsClassName: "inspector-line-marker",
        },
      },
    ]);

    instance.revealLineInCenter(start);
  }, [startLine, endLine, code]);

  return (
    <div className="code-inspector">
      <div className="inspector-header">
        <span>CODE INSPECTOR</span>
        <span>
          {startLine ? `Satır ${startLine}–${endLine}` : "Bir düğüm seç"}
        </span>
      </div>

      <Editor
        height="650px"
        language="csharp"
        theme="vs-dark"
        value={code}
        onMount={handleMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          renderLineHighlight: "line",
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
