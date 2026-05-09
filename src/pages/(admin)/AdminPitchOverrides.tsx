import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Music2, Plus, Trash2, ArrowLeft } from "lucide-react";

interface OverrideRow {
  id: string;
  word: string;
  reading: string;
  downstep: number;
  alternates: number[] | null;
  note: string | null;
  updated_at: string;
}

export default function AdminPitchOverrides() {
  const { isAdmin, loading } = useIsAdmin();
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ word: "", reading: "", downstep: "0", alternates: "", note: "" });

  const refresh = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("pitch_accent_overrides")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as OverrideRow[]);
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const submit = async () => {
    if (!form.word.trim() || !form.reading.trim()) { toast.error("Word + reading required"); return; }
    const downstep = parseInt(form.downstep, 10);
    if (Number.isNaN(downstep)) { toast.error("Downstep must be a number"); return; }
    const alternates = form.alternates.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
    setBusy(true);
    const { error } = await supabase.from("pitch_accent_overrides").upsert(
      {
        word: form.word.trim(),
        reading: form.reading.trim(),
        downstep,
        alternates: alternates.length ? alternates : null,
        note: form.note.trim() || null,
      },
      { onConflict: "word,reading" }
    );
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Đã lưu override"); setForm({ word: "", reading: "", downstep: "0", alternates: "", note: "" }); refresh(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa override này?")) return;
    const { error } = await supabase.from("pitch_accent_overrides").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Đã xóa"); refresh(); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button></Link>
          <Music2 className="h-5 w-5 text-pink-500" />
          <h1 className="text-2xl font-bold">Pitch Accent Overrides</h1>
          <Badge variant="outline">layer 0 — đè cả NHK</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Thêm / cập nhật override</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Word</Label><Input value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} placeholder="食べる" /></div>
            <div><Label className="text-xs">Reading (kana)</Label><Input value={form.reading} onChange={e => setForm({ ...form, reading: e.target.value })} placeholder="たべる" /></div>
            <div><Label className="text-xs">Downstep</Label><Input value={form.downstep} onChange={e => setForm({ ...form, downstep: e.target.value })} placeholder="2" /></div>
            <div><Label className="text-xs">Alternates (csv)</Label><Input value={form.alternates} onChange={e => setForm({ ...form, alternates: e.target.value })} placeholder="0,3" /></div>
            <div><Label className="text-xs">Note</Label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="NHK sai" /></div>
            <div className="md:col-span-5 flex justify-end">
              <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Word</TableHead><TableHead>Reading</TableHead><TableHead>Downstep</TableHead>
                <TableHead>Alternates</TableHead><TableHead>Note</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-japanese">{r.word}</TableCell>
                  <TableCell className="font-japanese">{r.reading}</TableCell>
                  <TableCell className="font-mono">{r.downstep}</TableCell>
                  <TableCell className="font-mono text-xs">{r.alternates?.join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.note || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {!rows.length && !busy && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có override nào</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
