import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface Experiment {
  id: string;
  key: string;
  description: string | null;
  variants: string[];
  is_active: boolean;
  traffic: number;
}

interface Funnel {
  variant: string;
  event: string;
  count: number;
}

const AdminExperiments: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [funnel, setFunnel] = useState<Record<string, Funnel[]>>({});
  const [newKey, setNewKey] = useState("");
  const [newVariants, setNewVariants] = useState("control,treatment");

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any).rpc("has_role", {
        p_user_id: user.id,
        p_role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user]);

  const refresh = async () => {
    const { data } = await (supabase as any)
      .from("experiments")
      .select("*")
      .order("created_at", { ascending: false });
    setExperiments((data as Experiment[]) ?? []);
    // load funnels
    const next: Record<string, Funnel[]> = {};
    for (const e of (data as Experiment[]) ?? []) {
      const { data: f } = await (supabase as any).rpc("get_experiment_funnel", {
        p_key: e.key,
      });
      next[e.key] = (f as Funnel[]) ?? [];
    }
    setFunnel(next);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  if (isAdmin === false) return <Navigate to="/" replace />;
  if (isAdmin === null)
    return <div className="p-6 text-muted-foreground">Đang kiểm tra quyền...</div>;

  const create = async () => {
    if (!newKey.trim()) return;
    const variants = newVariants
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const { error } = await (supabase as any).from("experiments").insert({
      key: newKey.trim(),
      variants,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Đã tạo experiment");
      setNewKey("");
      setNewVariants("control,treatment");
      refresh();
    }
  };

  const toggle = async (e: Experiment) => {
    await (supabase as any)
      .from("experiments")
      .update({ is_active: !e.is_active })
      .eq("id", e.id);
    refresh();
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">A/B Test Experiments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tạo experiment mới</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-sm">Key</label>
            <Input
              placeholder="homepage_cta_v1"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-sm">Variants (cách bằng dấu phẩy)</label>
            <Input
              value={newVariants}
              onChange={(e) => setNewVariants(e.target.value)}
            />
          </div>
          <Button onClick={create} className="bg-sakura hover:bg-sakura/90">
            Tạo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {experiments.map((e) => {
          const counts = funnel[e.key] ?? [];
          const assigns: Record<string, number> = {};
          const converts: Record<string, number> = {};
          for (const f of counts) {
            if (f.event === "assign") assigns[f.variant] = Number(f.count);
            else converts[f.variant] = (converts[f.variant] ?? 0) + Number(f.count);
          }
          return (
            <Card key={e.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-mono">{e.key}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    {e.variants.map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Switch checked={e.is_active} onCheckedChange={() => toggle(e)} />
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th>Variant</th>
                      <th>Assigned</th>
                      <th>Converted</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.variants.map((v) => {
                      const a = assigns[v] ?? 0;
                      const c = converts[v] ?? 0;
                      const rate = a > 0 ? ((c / a) * 100).toFixed(1) : "—";
                      return (
                        <tr key={v} className="border-t">
                          <td className="py-1 font-medium">{v}</td>
                          <td>{a}</td>
                          <td>{c}</td>
                          <td>{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
        {experiments.length === 0 && (
          <p className="text-muted-foreground">Chưa có experiment nào.</p>
        )}
      </div>
    </div>
  );
};

export default AdminExperiments;
