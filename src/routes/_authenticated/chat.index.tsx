import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: EmptyChat,
});

function EmptyChat() {
  return (
    <div className="flex-1 grid place-items-center bg-gradient-soft">
      <div className="text-center px-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
          <MessageCircle className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Selecione uma conversa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha um usuário na lista à esquerda ou inicie uma nova conversa.
        </p>
      </div>
    </div>
  );
}
