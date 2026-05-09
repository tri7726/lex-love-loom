import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, LineChart, ArrowLeft, RefreshCw } from "lucide-react";

interface TopMiss {
  feature: string;
  reason: string | null;
  word: string | null;
  reading: string | null;
  count: number;
}

export default function AdminTelemetry() {
  const { isAdmin, loading } = useIsAdmin();
  const [busy, setBusy] = useState(false);
  const [topMisses, setTopMisses] = useState<TopMiss[]>([]);
  const [eventCounts, setEventCounts] = useState<Array<{ feature: string; event: string; count: number }>>([]);
  const [recent, setRecent] = useState<Array<{ id: string; created_at: string; feature: string; event: string; reason: string | null; word: string | null; reading: string | null }>>([]);

  const refresh = async () => {
    setBusy(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      // Pull a sample (RLS allows admin) and aggregate client-side — keeps the migration light.
      const { data } = await supabase
        .from("analysis_telemetry")
        .select("id,created_at,feature,event,reason,word,reading")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);

      const rows = data ?? [];
      setRecent(rows.slice(0, 50));

      const evMap = new Map<string, number>();
      const missMap = new Map<string, TopMiss>();
      for (const r of rows) {
        const ek = `${r.feature}\t${r.event}`;
        evMap.set(ek, (evMap.get(ek) ?? 0) + 1);
        if (r.event === "miss") {
          const mk = `${r.feature}\t${r.reason ?? ""}\t${r.word ?? ""}\t${r.reading ?? ""}`;
          const cur = missMap.get(mk);
          if (cur) cur.count++;
          else missMap.set(mk, { feature: r.feature, reason: r.reason, word: r.word, reading: r.reading, count: 1 });
        }
      }
      setEventCounts([...evMap.entries()].map(([k, count]) => {
        const [feature, event] = k.split("\t");
        return { feature, event, count };
      }).sort((a, b) => b.count - a.count));
      setTopMisses([...missMap.values()].sort((a, b) => b.count - a.count).slice(0, 50));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button></Link>
          <LineChart className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-bold">AI Analysis Telemetry</h1>
          <Badge variant="outline">7 ngày gần nhất · tối đa 2000 sự kiện</Badge>
          <Button size="sm" variant="outline" onClick={refresh} disabled={busy} className="ml-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Tổng theo feature × event</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {eventCounts.map(c => (
                <Badge key={`${c.feature}-${c.event}`} variant={c.event === "miss" ? "destructive" : c.event === "hit" ? "default" : "secondary"} className="text-xs">
                  {c.feature} · {c.event}: {c.count}
                </Badge>
              ))}
              {!eventCounts.length && !busy && <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="top-misses">
          <TabsList>
            <TabsTrigger value="top-misses">Top Misses</TabsTrigger>
            <TabsTrigger value="recent">Recent events</TabsTrigger>
          </TabsList>

          <TabsContent value="top-misses" className="mt-4">
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Feature</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Word</TableHead><TableHead>Reading</TableHead><TableHead className="text-right">Count</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {topMisses.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{m.feature}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.reason || "—"}</Badge></TableCell>
                      <TableCell className="font-japanese">{m.word || "—"}</TableCell>
                      <TableCell className="font-japanese">{m.reading || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{m.count}</TableCell>
                    </TableRow>
                  ))}
                  {!topMisses.length && !busy && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có miss nào</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Feature</TableHead><TableHead>Event</TableHead>
                  <TableHead>Reason</TableHead><TableHead>Word</TableHead><TableHead>Reading</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {recent.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("vi")}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.feature}</Badge></TableCell>
                      <TableCell><Badge variant={r.event === "miss" ? "destructive" : "default"} className="text-xs">{r.event}</Badge></TableCell>
                      <TableCell className="text-xs">{r.reason || "—"}</TableCell>
                      <TableCell className="font-japanese">{r.word || "—"}</TableCell>
                      <TableCell className="font-japanese">{r.reading || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!recent.length && !busy && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có sự kiện</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
