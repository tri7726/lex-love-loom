import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(10);

    try {
      const text = await file.text();
      setProgress(30);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      setProgress(40);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/import-kanjidic2`,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml",
            "apikey": anonKey,
          },
          body: text,
        }
      );

      setProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
      setStatus("success");
      setProgress(100);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Kanjidic2
          </CardTitle>
          <CardDescription>
            Upload file kanjidic2.xml để import kanji vào database.
            <br />
            <a
              href="http://www.edrdg.org/kanjidic/kanjidic2.xml.gz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Tải kanjidic2.xml tại đây
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xml"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Click để chọn file XML</p>
            )}
          </div>

          {status === "uploading" && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">Đang xử lý...</p>
            </div>
          )}

          {status === "success" && result && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p>Import thành công!</p>
                <p>Đã parse: {result.total_parsed} kanji</p>
                <p>Đã insert: {result.total_inserted} kanji</p>
                {result.errors && (
                  <p className="text-yellow-600 mt-1">Lỗi: {result.errors.length} batch</p>
                )}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || status === "uploading"}
            className="w-full"
          >
            {status === "uploading" ? "Đang import..." : "Import Kanji"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
