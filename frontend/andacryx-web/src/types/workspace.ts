import type { AnalysisResult } from "../components/Sidebar";
import type { MethodFlowDto } from "../components/FlowDiagram";

export type FlowAnalysisResult = {
  fileName: string;
  methods: MethodFlowDto[];
};

export type WorkspaceFile = {
  id: string;
  name: string;
  path: string;
  sourceCode: string;
  analysis: AnalysisResult;
  flow: FlowAnalysisResult;
};