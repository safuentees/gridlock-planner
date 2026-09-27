import { parseFile, validateImport, IMPORT_LIMITS } from "../lib/imports";
import type {
  ParsedFile,
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "../lib/imports";
let parsed: ParsedFile | null = null;
let latestRequest = 0;
const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null;
  postMessage: (message: ImportWorkerResponse) => void;
};
worker.onmessage = async ({ data }) => {
  latestRequest = data.requestId;
  const requestId = data.requestId;
  try {
    if (data.type === "parse") {
      parsed = null;
      const file = await parseFile(data.fileName, data.buffer);
      if (requestId !== latestRequest) return;
      parsed = file;
      worker.postMessage({
        requestId,
        type: "parsed",
        sourceHash: file.sourceHash,
        sheets: file.sheets.map((sheet) => ({
          name: sheet.name,
          rowCount: sheet.rows.length,
          preview: sheet.rows.slice(0, IMPORT_LIMITS.headerRows + 5),
        })),
      });
    } else {
      if (!parsed) throw new Error("Select a file before validating.");
      const result = await validateImport(
        parsed,
        data.sheetName,
        data.headerRow,
        data.mapping,
        data.options,
      );
      if (requestId === latestRequest)
        worker.postMessage({ requestId, type: "validated", result });
    }
  } catch (error) {
    if (requestId === latestRequest)
      worker.postMessage({
        requestId,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "The file could not be imported.",
      });
  }
};
