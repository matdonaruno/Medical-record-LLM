import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function ChatHeader() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="border-b p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-bold">Local LLM Chat</h1>
        <p className="text-sm text-muted-foreground">Logged in as {user?.username}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
