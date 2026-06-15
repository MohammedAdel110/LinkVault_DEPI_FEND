import { cn } from "@/lib/utils";

export function ResponsiveTable({ children, className }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-md border bg-card", className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm data-table-responsive">
          {children}
        </table>
      </div>
    </div>
  );
}

// We'll use CSS to handle the responsive mobile card layout.
// Add this to globals.css
