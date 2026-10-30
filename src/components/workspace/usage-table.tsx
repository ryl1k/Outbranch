import type { UsageSummary } from "@/server/usage/summary"

const num = new Intl.NumberFormat("en")
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function UsageTable({ usage }: { usage: UsageSummary }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Provider calls", num.format(usage.totals.calls)],
          ["Model token cost", usd.format(usage.totals.costUsd)],
          ["Web searches", num.format(usage.totals.webSearches)],
          ["Qloo cache hits", num.format(usage.cacheHits)],
          ["Failed calls", num.format(usage.failures)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4">
            <dd className="font-mono text-xl">{v}</dd>
            <dt className="mt-1 text-xs text-muted-foreground">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              {["Provider", "Model", "Calls", "Input tokens", "Output tokens", "Web searches", "Retries", "Token cost"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y font-mono text-xs">
            {usage.rows.map((r) => (
              <tr key={`${r.provider}-${r.model}`}>
                <td className="px-3 py-2 font-sans">{r.provider}</td>
                <td className="px-3 py-2">{r.model ?? "—"}</td>
                <td className="px-3 py-2">{num.format(r._count._all)}</td>
                <td className="px-3 py-2">{num.format(r._sum.inputTokens ?? 0)}</td>
                <td className="px-3 py-2">{num.format(r._sum.outputTokens ?? 0)}</td>
                <td className="px-3 py-2">{num.format(r._sum.webSearches ?? 0)}</td>
                <td className="px-3 py-2">{num.format(r._sum.retries ?? 0)}</td>
                <td className="px-3 py-2">{r.provider === "ANTHROPIC" ? usd.format(r._sum.costUsd ?? 0) : "not priced"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Token cost uses published Anthropic list prices. Web search fees and Qloo usage are counted but not priced: Outbranch does
        not invent provider pricing.
      </p>
    </div>
  )
}
