import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ 
  icon: Icon = FolderOpen, 
  title = "No items found", 
  description = "Get started by creating a new one.", 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground opacity-60" />
      </div>
      <h3 className="font-display text-xl text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="min-w-[120px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
