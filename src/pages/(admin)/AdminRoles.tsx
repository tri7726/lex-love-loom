import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ArrowLeft, Search, UserPlus, Trash2, RefreshCw } from "lucide-react";

const ROLES = ["admin", "moderator", "teacher", "parent"] as const;
type Role = (typeof ROLES)[number];

interface RowUser {
  user_id: string;
  display_name: string | null;
  jlpt_level: string | null;
  total_xp: number | null;
  created_at: string;
  roles: string[];
}

export default function AdminRoles() {
  const { isAdmin, loading } = useIsAdmin();
  const { user: me } = useAuth();
  const [rows, setRows] = useState<RowUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Grant by email
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<Role>("admin");
  const [grantBusy, setGrantBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const [{ data: profiles }, { data: allRoles }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,jlpt_level,total_xp,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const map: Record<string, string[]> = {};
      (allRoles ?? []).forEach((r: { user_id: string; role: string }) => {
        (map[r.user_id] ??= []).push(r.role);
      });
      setRows((profiles ?? []).map((p) => ({ ...p, roles: map[p.user_id] ?? [] }) as RowUser));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const callRoleFn = async (payload: { action: "grant" | "revoke"; user_id?: string; email?: string; role: Role }) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-role", { body: payload });
    if (error) throw new Error(error.message || "Lỗi gọi edge function");
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data;
  };

  const grant = async (userId: string, role: Role) => {
    try { await callRoleFn({ action: "grant", user_id: userId, role }); toast.success(`Đã cấp ${role}`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const revoke = async (userId: string, role: Role) => {
    if (!confirm(`Thu hồi quyền ${role}?`)) return;
    try { await callRoleFn({ action: "revoke", user_id: userId, role }); toast.success(`Đã thu hồi ${role}`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const grantByEmail = async () => {
    if (!grantEmail.trim()) { toast.error("Nhập email"); return; }
    setGrantBusy(true);
    try {
      await callRoleFn({ action: "grant", email: grantEmail.trim(), role: grantRole });
      toast.success(`Đã cấp ${grantRole} cho ${grantEmail}`);
      setGrantEmail("");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setGrantBusy(false); }
  };

  const filtered = rows.filter((u) => {
    if (roleFilter !== "all") {
      if (roleFilter === "none" && u.roles.length) return false;
      if (roleFilter !== "none" && !u.roles.includes(roleFilter)) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.display_name ?? "").toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button></Link>
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Quản lý Roles & Permissions</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Cấp quyền theo email</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3 items-end">
            <div>
              <Label className="text-xs">Email người dùng</Label>
              <Input type="email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={grantRole} onValueChange={(v) => setGrantRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantByEmail} disabled={grantBusy}>{grantBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cấp quyền"}</Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Tìm theo tên hoặc user_id..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả roles</SelectItem>
              <SelectItem value="none">Chỉ user thường</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>Có role: {r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>JLPT</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Roles hiện tại</TableHead>
                <TableHead>Cấp role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id} className={u.user_id === me?.id ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {u.display_name || "Chưa đặt tên"}
                        {u.user_id === me?.id && <Badge variant="outline" className="text-[10px]">Bạn</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{u.jlpt_level || "—"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{u.total_xp ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <Badge variant="secondary" className="text-xs">user</Badge>}
                      {u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs gap-1 pr-1">
                          {r}
                          <button
                            onClick={() => revoke(u.user_id, r as Role)}
                            className="ml-0.5 rounded hover:bg-destructive/20 p-0.5"
                            title={`Thu hồi ${r}`}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={(v) => grant(u.user_id, v as Role)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="+ Thêm role" /></SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && !busy && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Không có người dùng</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
