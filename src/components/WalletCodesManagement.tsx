import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Power, PowerOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface WalletCode {
  id: string;
  code: string;
  value: number;
  max_uses: number;
  current_uses: number;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const WalletCodesManagement = () => {
  const [codes, setCodes] = useState<WalletCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("1");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wallet_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch wallet codes");
      console.error(error);
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim() || !newValue || parseFloat(newValue) <= 0) {
      toast.error("Please enter a valid code and value");
      return;
    }

    if (!newMaxUses || parseInt(newMaxUses) <= 0) {
      toast.error("Max uses must be at least 1");
      return;
    }

    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    
    const insertData: any = {
      code: newCode.trim(),
      value: parseFloat(newValue),
      max_uses: parseInt(newMaxUses),
      created_by: userData.user?.id,
    };

    if (newExpiresAt) {
      insertData.expires_at = new Date(newExpiresAt).toISOString();
    }

    const { error } = await supabase
      .from("wallet_codes")
      .insert(insertData);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Code already exists" : "Failed to create code");
      console.error(error);
    } else {
      toast.success("Wallet code created successfully");
      setNewCode("");
      setNewValue("");
      setNewMaxUses("1");
      setNewExpiresAt("");
      fetchCodes();
    }
    setCreating(false);
  };

  const handleDeleteCode = async (id: string) => {
    const { error } = await supabase
      .from("wallet_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete code");
      console.error(error);
    } else {
      toast.success("Code deleted successfully");
      fetchCodes();
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("wallet_codes")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update code");
      console.error(error);
    } else {
      toast.success(currentActive ? "Code deactivated" : "Code activated");
      fetchCodes();
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isFullyUsed = (code: WalletCode) => {
    return code.current_uses >= code.max_uses;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Wallet Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="WELCOME2025"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="value">Value ($)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="10.00"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                placeholder="1"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreateCode} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Wallet Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No wallet codes created yet
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-semibold">{code.code}</TableCell>
                    <TableCell>${code.value.toFixed(2)}</TableCell>
                    <TableCell>
                      {code.current_uses} / {code.max_uses}
                    </TableCell>
                    <TableCell>
                      {isFullyUsed(code) ? (
                        <Badge variant="secondary">Fully Used</Badge>
                      ) : isExpired(code.expires_at) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : code.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {new Date(code.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={code.active ? "outline" : "default"}
                          onClick={() => handleToggleActive(code.id, code.active)}
                        >
                          {code.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCode(code.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
