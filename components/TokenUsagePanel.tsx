"use client";

interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface Props {
  usage: Usage | null;
  elapsedMs: number | null;
  model: string;
  phase: string;
  stages?: { stage: string; elapsedMs: number }[] | null;
}

export default function TokenUsagePanel({ usage, elapsedMs, model, phase, stages }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 border border-border-color text-xs">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <span className="text-text-secondary">模型：</span>
          <span className="font-mono font-semibold text-accent">{model}</span>
        </div>
        <div>
          <span className="text-text-secondary">阶段：</span>
          <span
            className={`font-semibold ${
              phase === "error"
                ? "text-red-600"
                : phase === "done"
                ? "text-green-600"
                : "text-blue-600"
            }`}
          >
            {phase}
          </span>
        </div>
        {elapsedMs !== null && (
          <div>
            <span className="text-text-secondary">总耗时：</span>
            <span className="font-mono font-semibold text-accent">
              {(elapsedMs / 1000).toFixed(2)}s
            </span>
          </div>
        )}
        {usage && (
          <>
            <div>
              <span className="text-text-secondary">Prompt：</span>
              <span className="font-mono font-semibold text-accent">
                {usage.promptTokens.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Completion：</span>
              <span className="font-mono font-semibold text-accent">
                {usage.completionTokens.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Total：</span>
              <span className="font-mono font-semibold text-accent">
                {usage.totalTokens.toLocaleString()}
              </span>
            </div>
          </>
        )}
        {stages && stages.length > 0 && (
          <details className="ml-auto">
            <summary className="cursor-pointer text-text-secondary hover:text-accent">
              阶段耗时
            </summary>
            <div className="mt-1 space-y-0.5 text-text-secondary">
              {stages.map((s) => (
                <div key={s.stage}>
                  {s.stage}: <span className="font-mono">{(s.elapsedMs / 1000).toFixed(2)}s</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
