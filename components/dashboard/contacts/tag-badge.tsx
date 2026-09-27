import type { TagName } from "@/components/dashboard/contacts/contacts-data";

const TAG_STYLES: Record<TagName, string> = {
  VIP: "bg-amber-400/15 text-amber-300",
  Frio: "bg-sky-500/10 text-sky-300",
  Afiliado: "bg-primary/15 text-primary",
};

export function TagBadge({ tag }: { tag: TagName }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_STYLES[tag]}`}>
      {tag}
    </span>
  );
}
