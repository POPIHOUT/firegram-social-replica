import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SACCode {
  id: string;
  code: string;
  user_id: string;
  active: boolean;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface Profile {
  id: string;
  username: string;
}

const SACCodesManagement = () => {
  const { toast } = useToast();
  const [sacCodes, setSacCodes] = useState<SACCode[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newCode, setNewCode] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSACCodes();
    fetchProfiles();
  }, []);

  const fetchSACCodes = async () => {
    const { data, error } = await supabase
      .from("sac_codes")
      .select(`
        *,
        profiles:user_id (username)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch SAC codes",
        variant: "destructive",
      });
      return;
    }

    setSacCodes(data || []);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      return;
    }

    setProfiles(data || []);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim() || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please enter a code and select a user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("sac_codes")
      .insert({
        code: newCode.trim().toUpperCase(),
        user_id: selectedUserId,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "This code already exists"
          : "Failed to create SAC code",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "SAC code created successfully",
      });
      setNewCode("");
      setSelectedUserId("");
      fetchSACCodes();
    }
    setLoading(false);
  };

  const handleDeleteCode = async (id: string) => {
    const { error } = await supabase.from("sac_codes").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete SAC code",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "SAC code deleted successfully",
      });
      fetchSACCodes();
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("sac_codes")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update SAC code",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `SAC code ${!currentActive ? "activated" : "deactivated"}`,
      });
      fetchSACCodes();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create SAC Code</CardTitle>
          <CardDescription>
            Create Support a Creator codes for users. Creators get 15% commission, customers get 5% discount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="Enter SAC code (e.g., CREATOR123)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="user">Assign to User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreateCode}
            disabled={loading || !newCode.trim() || !selectedUserId}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create SAC Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing SAC Codes</CardTitle>
          <CardDescription>Manage all Support a Creator codes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sacCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold">{code.code}</TableCell>
                  <TableCell>{code.profiles?.username || "Unknown"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        code.active
                          ? "bg-green-500/20 text-green-500"
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {code.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(code.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(code.id, code.active)}
                      >
                        {code.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCode(code.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sacCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No SAC codes created yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SACCodesManagement;
