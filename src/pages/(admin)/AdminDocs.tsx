import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, FileText, ShieldCheck, Upload, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Built-in docs from /docs/*.md (bundled at build time)
const DOC_MODULES = import.meta.glob("/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type DocSource = "builtin" | "uploaded";

interface DocEntry {
  id: string;            // slug for builtin, row id for uploaded
  source: DocSource;
  slug: string;
  title: string;
  description?: string;
  mime: string;
  content?: string;      // text content (md/txt) — inline
  storagePath?: string;  // for binary
  size?: number;
  createdAt?: string;
}

const TEXT_MIME = /^(text\/|application\/json$|application\/xml$)/i;
const ALLOWED_EXT = [".md", ".markdown", ".txt", ".json", ".csv", ".log", ".pdf"];

function inferMime(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".md") || n.endsWith(".markdown")) return "text/markdown";
  if (n.endsWith(".txt") || n.endsWith(".log")) return "text/plain";
  if (n.endsWith(".json")) return "application/json";
  if (n.endsWith(".csv")) return "text/csv";
  if (n.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "doc";
}

function buildBuiltins(): DocEntry[] {
  return Object.entries(DOC_MODULES)
    .map(([path, content]) => {
      const fileName = path.split("/").pop() || path;
      const slug = fileName.replace(/\.md$/i, "");
      const h1 = content.match(/^#\s+(.+)$/m);
      const title = h1 ? h1[1].trim() : slug.replace(/[_-]+/g, " ");
      return {
        id: `builtin:${slug}`,
        source: "builtin" as const,
        slug,
        title,
        mime: "text/markdown",
        content,
        size: content.length,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const AdminDocs: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [params, setParams] = useSearchParams();
  const [uploaded, setUploaded] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const builtins = useMemo(buildBuiltins, []);
  const entries = useMemo(() => [...builtins, ...uploaded], [builtins, uploaded]);

  const activeSlug = params.get("doc") ?? entries[0]?.slug ?? "";
  const active = entries.find((e) => e.slug === activeSlug) ?? entries[0];

  // Auth check
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data } = await (supabase as any).rpc("has_role", {
        p_user_id: user.id, p_role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user]);

  // Load uploaded docs
  const loadUploaded = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_docs")
      .select("id, slug, title, description, mime, content, storage_path, size_bytes, created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Không tải được tài liệu: " + error.message); return; }
    setUploaded(
      (data ?? []).map((r: any) => ({
        id: r.id,
        source: "uploaded" as const,
        slug: r.slug,
        title: r.title,
        description: r.description,
        mime: r.mime,
        content: r.content,
        storagePath: r.storage_path,
        size: r.size_bytes,
        createdAt: r.created_at,
      })),
    );
  }, []);

  useEffect(() => { if (isAdmin) void loadUploaded(); }, [isAdmin, loadUploaded]);

  // Sign URL for binary uploaded docs
  useEffect(() => {
    setSignedUrl(null);
    if (!active || active.source !== "uploaded" || !active.storagePath) return;
    (async () => {
      const { data, error } = await supabase.storage
        .from("sensei-docs")
        .createSignedUrl(active.storagePath!, 60 * 10);
      if (!error && data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
  }, [active]);

  const handleUpload = async (file: File) => {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Định dạng không hỗ trợ: ${ext}`);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File > 20MB. Vui lòng chia nhỏ.");
      return;
    }
    setUploading(true);
    try {
      const mime = inferMime(file);
      const baseTitle = file.name.replace(/\.[^.]+$/, "");
      let slug = slugify(baseTitle) + "-" + Date.now().toString(36);
      const isText = TEXT_MIME.test(mime) || mime === "text/markdown";
      let content: string | null = null;
      let storagePath: string | null = null;

      if (isText) {
        content = await file.text();
        // Try infer title from H1 if markdown
        if (mime === "text/markdown") {
          const h1 = content.match(/^#\s+(.+)$/m);
          if (h1) slug = slugify(h1[1]) + "-" + Date.now().toString(36);
        }
      } else {
        storagePath = `${user!.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("sensei-docs")
          .upload(storagePath, file, { contentType: mime, upsert: false });
        if (upErr) throw upErr;
      }

      const { error: insErr } = await (supabase as any).from("admin_docs").insert({
        slug,
        title: baseTitle,
        mime,
        content,
        storage_path: storagePath,
        size_bytes: file.size,
        uploaded_by: user!.id,
      });
      if (insErr) throw insErr;

      toast.success("Đã upload: " + file.name);
      await loadUploaded();
      setParams({ doc: slug });
    } catch (e: any) {
      toast.error("Upload lỗi: " + (e?.message ?? String(e)));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (entry: DocEntry) => {
    if (entry.source !== "uploaded") return;
    if (!confirm(`Xoá tài liệu "${entry.title}"?`)) return;
    if (entry.storagePath) {
      await supabase.storage.from("sensei-docs").remove([entry.storagePath]);
    }
    const { error } = await (supabase as any).from("admin_docs").delete().eq("id", entry.id);
    if (error) { toast.error("Xoá lỗi: " + error.message); return; }
    toast.success("Đã xoá");
    await loadUploaded();
    if (active?.id === entry.id) setParams({});
  };

  if (isAdmin === false) return <Navigate to="/" replace />;
  if (isAdmin === null)
    return <div className="p-6 text-muted-foreground">Đang kiểm tra quyền…</div>;

  const isPdf = active?.mime === "application/pdf";
  const isMarkdown = active?.mime === "text/markdown" || (active?.source === "builtin");
  const isText = active && (TEXT_MIME.test(active.mime) || isMarkdown);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-light/10 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-sakura" />
              <Badge className="bg-sakura/10 text-sakura border-sakura/20 hover:bg-sakura/15">Admin only</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">🌸 Sensei Skill Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tài liệu nội bộ + tài liệu admin tự upload (md, txt, json, csv, pdf — tối đa 20MB).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{entries.length} tài liệu</Badge>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXT.join(",")}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-sakura hover:bg-sakura/90"
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Đang upload…</>
                : <><Upload className="h-4 w-4 mr-1" /> Upload tài liệu</>}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <Card className="p-3 h-fit lg:sticky lg:top-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" /> Built-in ({builtins.length})
            </div>
            <div className="mt-1 space-y-0.5">
              {builtins.map((e) => (
                <DocButton key={e.id} entry={e} active={active?.id === e.id}
                  onSelect={() => setParams({ doc: e.slug })} />
              ))}
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1.5">
              <Upload className="h-3 w-3" /> Đã upload ({uploaded.length})
            </div>
            <div className="mt-1 space-y-0.5">
              {loading && <p className="text-xs text-muted-foreground px-2 py-2">Đang tải…</p>}
              {!loading && uploaded.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">Chưa có tài liệu nào.</p>
              )}
              {uploaded.map((e) => (
                <DocButton key={e.id} entry={e} active={active?.id === e.id}
                  onSelect={() => setParams({ doc: e.slug })}
                  onDelete={() => handleDelete(e)} />
              ))}
            </div>
          </Card>

          {/* Reader */}
          <Card className="overflow-hidden">
            {active ? (
              <>
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-muted/30">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {active.source === "builtin" ? `/docs/${active.slug}.md` : active.mime}
                    </div>
                    <div className="text-sm font-bold truncate">{active.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {active.source === "uploaded" && signedUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={signedUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Mở tab mới
                        </a>
                      </Button>
                    )}
                    {isText && active.content && (
                      <Button size="sm" variant="outline"
                        onClick={() => {
                          const blob = new Blob([active.content!], { type: active.mime });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${active.slug}${active.mime === "text/markdown" ? ".md" : ""}`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>
                        Tải xuống
                      </Button>
                    )}
                  </div>
                </div>

                {isMarkdown && active.content ? (
                  <ScrollArea className="h-[calc(100vh-260px)]">
                    <article className="prose prose-sm sm:prose-base max-w-none px-6 py-8 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:border-b prose-h2:pb-1 prose-h2:border-sakura-light/30 prose-h3:text-lg prose-code:text-sakura-dark prose-code:bg-sakura/5 prose-code:px-1 prose-code:rounded prose-pre:bg-muted/60 prose-pre:border prose-table:text-sm prose-th:bg-muted/50 prose-a:text-sakura">
                      <ReactMarkdown>{active.content}</ReactMarkdown>
                    </article>
                  </ScrollArea>
                ) : isText && active.content ? (
                  <ScrollArea className="h-[calc(100vh-260px)]">
                    <pre className="text-xs px-6 py-6 whitespace-pre-wrap break-words font-mono">{active.content}</pre>
                  </ScrollArea>
                ) : isPdf && signedUrl ? (
                  <iframe src={signedUrl} className="w-full h-[calc(100vh-260px)] bg-muted" title={active.title} />
                ) : active.source === "uploaded" && signedUrl ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Định dạng <code>{active.mime}</code> không xem trực tiếp.{" "}
                    <a href={signedUrl} target="_blank" rel="noreferrer" className="text-sakura underline">
                      Tải xuống
                    </a>
                  </div>
                ) : (
                  <div className="p-10 text-center text-muted-foreground">Đang chuẩn bị nội dung…</div>
                )}
              </>
            ) : (
              <div className="p-10 text-center text-muted-foreground">Chưa có document nào.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const DocButton: React.FC<{
  entry: DocEntry;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}> = ({ entry, active, onSelect, onDelete }) => (
  <div
    className={cn(
      "group rounded-lg flex items-start gap-2 transition-all",
      active ? "bg-sakura/10" : "hover:bg-muted/60",
    )}
  >
    <button onClick={onSelect} className="flex-1 min-w-0 text-left px-3 py-2 flex items-start gap-2">
      <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-sakura" : "text-muted-foreground/60")} />
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium truncate", active && "text-sakura")}>{entry.title}</div>
        <div className="text-[10px] text-muted-foreground/70 truncate">
          {entry.slug} · {entry.mime.split("/").pop()}
          {entry.size != null && ` · ${(entry.size / 1024).toFixed(1)}KB`}
        </div>
      </div>
    </button>
    {onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition"
        title="Xoá"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default AdminDocs;
