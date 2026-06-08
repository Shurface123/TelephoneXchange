import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background text-foreground transition-all duration-300">
      <div className="text-center p-6 rounded-2xl bg-card border border-border/40 shadow-xl max-w-sm w-full mx-auto space-y-4">
        {/* Animated cocoa gold spinner */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <RefreshCw className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Loading Page</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Fetching resources from COCOBOD Exchange...
          </p>
        </div>
        {/* Subtle progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className="bg-primary h-1.5 rounded-full animate-infinite-loading" />
        </div>
      </div>
      
      <style>{`
        @keyframes infinite-loading {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(300%); width: 30%; }
        }
        .animate-infinite-loading {
          animation: infinite-loading 1.8s infinite linear;
        }
      `}</style>
    </div>
  )
}
