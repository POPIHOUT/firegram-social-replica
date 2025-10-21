import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, CreditCard, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FlamePurchase {
  id: string;
  user_id: string;
  flame_amount: number;
  price_usd: number;
  status: string;
  card_type: string;
  card_last4: string;
  card_holder_name: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface FlamePurchaseCardProps {
  purchase: FlamePurchase;
  onApprove: (purchaseId: string) => void;
  onReject: (purchase: FlamePurchase) => void;
}

const FlamePurchaseCard = ({ purchase, onApprove, onReject }: FlamePurchaseCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-10 h-10">
              <AvatarImage src={purchase.profiles.avatar_url} />
              <AvatarFallback>{purchase.profiles.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{purchase.profiles.username}</p>
                <Badge variant={purchase.status === "approved" ? "default" : purchase.status === "rejected" ? "destructive" : "secondary"}>
                  {purchase.status}
                </Badge>
              </div>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">{purchase.flame_amount.toLocaleString()} flames</span>
                  <span className="text-muted-foreground">for ${purchase.price_usd}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="capitalize">{purchase.card_type}</span>
                  <span className="text-muted-foreground">****{purchase.card_last4}</span>
                </div>
                
                <div className="text-muted-foreground text-xs">
                  {purchase.card_holder_name}
                </div>
                
                <div className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
          
          {purchase.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
                onClick={() => onApprove(purchase.id)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                onClick={() => onReject(purchase)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlamePurchaseCard;
