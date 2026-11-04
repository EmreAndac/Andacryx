import type { DotnetManifest } from "../types/dotnetProject";

function normalize(path: string): string { return path.replaceAll("\\", "/"); }
function textBetween(xml: string, tag: string): string[] {
  const matches = [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>([^<]*)<\\/${tag}>`, "gi"))];
  return matches.flatMap(match => match[1].split(";").map(value => value.trim()).filter(Boolean));
}
function attributeValues(xml: string, element: string, attribute: string): string[] {
  const results: string[] = [];
  const pattern = new RegExp(`<${element}\\b([^>]*)>`, "gi");
  for (const match of xml.matchAll(pattern)) {
    const attr = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i").exec(match[1]);
    if (attr) results.push(normalize(attr[1]));
  }
  return results;
}
export function parseDotnetManifest(path: string, contents: string): DotnetManifest | null {
  const normalized = normalize(path);
  const name = normalized.split("/").pop() ?? normalized;
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "csproj") {
    return { path: normalized, name, kind: "project", format: "csproj", projectPaths: [],
      targetFrameworks: [...new Set([...textBetween(contents, "TargetFramework"), ...textBetween(contents, "TargetFrameworks")])],
      projectReferences: attributeValues(contents, "ProjectReference", "Include") };
  }
  if (extension === "sln") {
    const paths = [...contents.matchAll(/^Project\([^\r\n]*?=\s*"[^"]+"\s*,\s*"([^"]+\.csproj)"/gim)].map(m => normalize(m[1]));
    return { path: normalized, name, kind: "solution", format: "sln", projectPaths: [...new Set(paths)], targetFrameworks: [], projectReferences: [] };
  }
  if (extension === "slnx") {
    const paths = attributeValues(contents, "Project", "Path").filter(p => p.toLowerCase().endsWith(".csproj"));
    return { path: normalized, name, kind: "solution", format: "slnx", projectPaths: [...new Set(paths)], targetFrameworks: [], projectReferences: [] };
  }
  return null;
}
