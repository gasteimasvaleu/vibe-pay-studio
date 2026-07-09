import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: EmptyChat,
});

function EmptyChat() {
  return (
    <div className="flex-1 grid place-items-center bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.08),transparent_60%)]">
      <div className="text-center px-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center shadow-lg shadow-fuchsia-500/30">
          <MessageCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Selecione uma conversa</h2>
        <p className="mt-1 text-sm text-white/50">
          Escolha um usuário na lista à esquerda ou inicie uma nova conversa.
        </p>
      </div>
    </div>
  );
}
