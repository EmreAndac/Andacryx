export type DotnetManifest = {
  path: string;
  name: string;
  kind: "solution" | "project";
  format: "sln" | "slnx" | "csproj";
  projectPaths: string[];
  targetFrameworks: string[];
  projectReferences: string[];
};
