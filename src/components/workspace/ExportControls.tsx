import { Download, FileJson, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildExport, downloadFile, exportMarkdown } from "@/lib/export";
import type { Workspace } from "@/lib/queries";

export function ExportControls({ data }: { data: Workspace }) {
  const exportAs = (format: "md" | "json") => {
    const doc = buildExport(data);
    const body = format === "md" ? exportMarkdown(doc) : JSON.stringify(doc, null, 2);
    const filename = `${data.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "specification"}.${format}`;
    downloadFile(new Blob([body], { type: format === "md" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8" }), filename);
  };
  return <div className="no-print flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" onClick={() => exportAs("md")}><Download className="size-4" />Markdown</Button>
    <Button variant="outline" size="sm" onClick={() => exportAs("json")}><FileJson className="size-4" />JSON</Button>
    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" />Print / PDF</Button>
    <span className="w-full text-xs text-muted-foreground">For PDF, choose “Save as PDF” in the print dialog.</span>
  </div>;
}