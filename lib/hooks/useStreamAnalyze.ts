"use client";

import { useCallback, useRef, useState } from "react";
import type { AnalysisResult, SseEvent } from "@/lib/schemas";

export type Phase =
  | "idle"
  | "parsing-pdf"
  | "stage-split"
  | "stage-analyze"
  | "stage-aggregate"
  | "done"
  | "error";

export type Mode = "single" | "multi-agent";

export interface SectionProgress {
  parsed: { sectionId: string; sectionTitle: string }[];
  analyzed: { sectionId: string; cardCount: number }[];
}

export interface StreamState {
  phase: Phase;
  mode: Mode;
  result: AnalysisResult | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  elapsedMs: number | null;
  stages: { stage: string; elapsedMs: number }[] | null;
  error: string | null;
  errorCode: string | null;
  errorStage: string | null;
  progress: SectionProgress;
  rawChunk: string;
}

const INITIAL: StreamState = {
  phase: "idle",
  mode: "single",
  result: null,
  usage: null,
  elapsedMs: null,
  stages: null,
  error: null,
  errorCode: null,
  errorStage: null,
  progress: { parsed: [], analyzed: [] },
  rawChunk: "",
};

function parseSseChunk(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const events: { event: string; data: string }[] = [];
  let sep: number;
  let working = buffer;
  while ((sep = working.indexOf("\n\n")) !== -1) {
    const rawEvent = working.slice(0, sep);
    working = working.slice(sep + 2);
    const lines = rawEvent.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data += line.slice(6);
    }
    if (data) events.push({ event, data });
  }
  return { events, rest: working };
}

export function useStreamAnalyze() {
  const [state, setState] = useState<StreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const analyze = useCallback(async (text: string, mode: Mode = "single") => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState({ ...INITIAL, phase: mode === "multi-agent" ? "stage-split" : "analyzing", mode });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "网络错误" }));
        setState((s) => ({
          ...s,
          phase: "error",
          error: err.error ?? "请求失败",
          errorCode: "HTTP_ERROR",
        }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseChunk(buffer);
        buffer = rest;

        for (const { event, data } of events) {
          let payload: SseEvent["data"] | null = null;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }
          const e = { event: event as SseEvent["event"], data: payload } as SseEvent;

          setState((s) => {
            switch (e.event) {
              case "meta":
                return { ...s, mode: e.data.mode };
              case "stage":
                return {
                  ...s,
                  phase:
                    e.data.stage === "split"
                      ? "stage-split"
                      : e.data.stage === "analyze"
                      ? "stage-analyze"
                      : "stage-aggregate",
                };
              case "section/parsed":
                return {
                  ...s,
                  progress: {
                    ...s.progress,
                    parsed: [
                      ...s.progress.parsed,
                      { sectionId: e.data.sectionId, sectionTitle: e.data.sectionTitle },
                    ],
                  },
                };
              case "section/analyzed":
                return {
                  ...s,
                  progress: {
                    ...s.progress,
                    analyzed: [
                      ...s.progress.analyzed,
                      { sectionId: e.data.sectionId, cardCount: e.data.cardCount },
                    ],
                  },
                };
              case "chunk":
                return { ...s, rawChunk: e.data.delta };
              case "result":
                return {
                  ...s,
                  phase: "done",
                  result: e.data.result,
                  usage: e.data.usage ?? null,
                  elapsedMs: e.data.elapsedMs,
                  stages: e.data.stages ?? null,
                };
              case "error":
                return {
                  ...s,
                  phase: "error",
                  error: e.data.message,
                  errorCode: e.data.code ?? null,
                  errorStage: e.data.stage ?? null,
                };
              default:
                return s;
            }
          });
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setState((s) => ({ ...s, phase: "error", error: "已取消", errorCode: "ABORTED" }));
        return;
      }
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "未知错误",
        errorCode: "NETWORK",
      }));
    }
  }, []);

  const parsePdf = useCallback(async (file: File) => {
    setState((s) => ({ ...s, phase: "parsing-pdf", error: null, errorCode: null }));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: json.error ?? "PDF 解析失败",
          errorCode: "PDF_PARSE_FAIL",
        }));
        return null;
      }
      return json.data.text as string;
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "PDF 上传失败",
        errorCode: "PDF_UPLOAD_FAIL",
      }));
      return null;
    }
  }, []);

  return { state, analyze, parsePdf, reset, cancel };
}
