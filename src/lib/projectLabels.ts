import type { Project } from "../types";

/** Make source line numbers explicit without changing project identity or evidence. */
export function displayProjectName(project: Project): string {
  return project.shortName.replace(/\s+#(\d+)\b/g, " · Line $1");
}
