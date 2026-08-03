import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, AtSign, BadgeCheck, MessageCircle, MoreVertical, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ActionPopover,
  ActionPopoverItem,
  ActionPopoverList,
} from "@/components/ui/action-popover";
import type { MentionedProfile } from "@/lib/publications.functions";

export function MentionedProfileCard({ profile }: { profile: MentionedProfile }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const displayName = profile.display_name ?? profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  async function share() {
    setOpen(false);
    const url = `${window.location.origin}/perfil/${profile.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, url });
        return;
      } catch {
        return;
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
      <Link
        to="/perfil/$username"
        params={{ username: profile.username }}
        className="block"
      >
        <div className="h-24 w-full bg-muted overflow-hidden">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}
        </div>
        <div className="pl-24 pr-12 py-3 min-h-[60px]">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">
              {displayName}
            </span>
            {profile.verified && (
              <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{profile.username}
          </p>
        </div>
        <Avatar className="absolute left-3 top-12 h-20 w-20 border-4 border-card z-10">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="absolute right-2 top-2 z-20">
        <ActionPopover
          open={open}
          onOpenChange={setOpen}
          trigger={
            <button
              type="button"
              aria-label="Opções do perfil referenciado"
              className="h-9 w-9 grid place-items-center rounded-full bg-background/70 backdrop-blur text-foreground hover:bg-background transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          }
        >
          <ActionPopoverList>
            <ActionPopoverItem
              icon={<AtSign className="h-6 w-6 text-primary" strokeWidth={1.75} />}
              label={`@${profile.username}`}
              onClick={() => {
                setOpen(false);
                navigate({
                  to: "/perfil/$username",
                  params: { username: profile.username },
                });
              }}
            />
            <ActionPopoverItem
              icon={<MessageCircle className="h-6 w-6 text-primary" strokeWidth={1.75} />}
              label="Chat"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/chat" });
              }}
            />
            <ActionPopoverItem
              icon={<Share2 className="h-6 w-6 text-primary" strokeWidth={1.75} />}
              label="Compartilhar"
              onClick={share}
            />
            <ActionPopoverItem
              icon={<AlertCircle className="h-6 w-6 text-primary" strokeWidth={1.75} />}
              label="Denunciar perfil"
              onClick={() => {
                setOpen(false);
                toast.success("Denúncia enviada. Nossa equipe irá analisar este perfil.");
              }}
            />
          </ActionPopoverList>
        </ActionPopover>
      </div>
    </div>
  );
}
