'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PatchResult } from '@/labs/markdown-stream-rendering/types/markdown';
import type {
  BenchmarkPhase,
  MarkdownStreamLabController,
  PatchLogEntry,
} from '@/labs/markdown-stream-rendering/types/controller';
import type { StreamConfiguration, StreamFrame } from '@/labs/markdown-stream-rendering/types/fixture';
import type { IncrementalSample, LegacySample, RuntimeStatus } from '@/labs/markdown-stream-rendering/types/renderer';

import { BENCHMARK_SEPARATOR } from '../fixtures/benchmark';
import { MARKDOWN_FIXTURES } from '../fixtures/fixtures';
import { createStreamFrames, DeterministicStreamer } from '../fixtures/streamer';
import { MarkdownMetricsCollector } from '../metrics/collector';
import { createEmptyMetricsSnapshot } from '../metrics/empty';
import { useBenchmarkBaseline } from './use-benchmark-baseline';

const DEFAULT_CONFIGURATION: StreamConfiguration = {
  chunkRange: [2, 7],
  fps: 20,
  mode: 'char',
  seed: 5005,
};
const MAX_PATCH_LOG_ENTRIES = 160;

export const useMarkdownStreamLab = (): MarkdownStreamLabController => {
  const benchmarkBaseline = useBenchmarkBaseline();
  const [fixtureId, setFixtureId] = useState('mixed');
  const [content, setContent] = useState('');
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [instanceCount, setInstanceCountState] = useState<1 | 4>(1);
  const [phase, setPhase] = useState<BenchmarkPhase>('loading');
  const [runId, setRunId] = useState(0);
  const [failureSignal, setFailureSignal] = useState(0);
  const [metrics, setMetrics] = useState(createEmptyMetricsSnapshot);
  const [patchLog, setPatchLog] = useState<PatchLogEntry[]>([]);
  const [runtimeStatuses, setRuntimeStatuses] = useState<Readonly<Record<number, RuntimeStatus>>>({});
  const collector = useRef(new MarkdownMetricsCollector());
  const streamer = useRef<DeterministicStreamer | null>(null);
  const patchSequence = useRef(0);
  const measurementActive = useRef(false);
  const autoStartAfterPrepare = useRef(false);
  const phaseRef = useRef<BenchmarkPhase>('loading');
  const runtimeStatusesRef = useRef<Readonly<Record<number, RuntimeStatus>>>({});
  const instanceCountRef = useRef<1 | 4>(1);
  const baselineLengthRef = useRef(benchmarkBaseline.baseline.length);
  const activeFixture = useMemo(() => {
    return (
      MARKDOWN_FIXTURES.find((fixture) => {
        return fixture.id === fixtureId;
      }) ?? MARKDOWN_FIXTURES[0]
    );
  }, [fixtureId]);
  const clearMeasurements = useCallback(() => {
    collector.current.reset();
    patchSequence.current = 0;
    setMetrics(createEmptyMetricsSnapshot());
    setPatchLog([]);
  }, []);
  const transitionPhase = useCallback((nextPhase: BenchmarkPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);
  const prepareBaseline = useCallback(() => {
    if (benchmarkBaseline.baseline.length === 0) {
      return;
    }
    streamer.current?.pause();
    streamer.current = null;
    baselineLengthRef.current = benchmarkBaseline.baseline.length;
    measurementActive.current = false;
    clearMeasurements();
    setContent(benchmarkBaseline.baseline);
    runtimeStatusesRef.current = {};
    setRuntimeStatuses({});
    transitionPhase('preparing');
    setRunId((current) => {
      return current + 1;
    });
  }, [benchmarkBaseline.baseline, clearMeasurements, transitionPhase]);
  const handleFrame = useCallback((frame: StreamFrame) => {
    if (measurementActive.current) {
      collector.current.recordInputFrame();
    }
    setContent(frame.cumulative);
  }, []);
  const handleFinish = useCallback(() => {
    collector.current.finish();
    transitionPhase('completed');
  }, [transitionPhase]);
  const beginStream = useCallback(() => {
    if (benchmarkBaseline.baseline.length === 0) {
      return;
    }
    clearMeasurements();
    measurementActive.current = true;
    const continuationPrefix = `${benchmarkBaseline.baseline}${BENCHMARK_SEPARATOR}## 实时流式续写\n\n`;
    const frames = createStreamFrames(
      activeFixture.content,
      {
        ...configuration,
        seed: activeFixture.seed,
      },
      continuationPrefix,
    );
    const nextStreamer = new DeterministicStreamer(frames, configuration.fps, handleFrame, handleFinish);
    streamer.current = nextStreamer;
    collector.current.start();
    transitionPhase('running');
    nextStreamer.start();
  }, [
    activeFixture,
    benchmarkBaseline.baseline,
    clearMeasurements,
    configuration,
    handleFinish,
    handleFrame,
    transitionPhase,
  ]);
  const togglePlayback = useCallback(() => {
    const existing = streamer.current;
    if (phase === 'running') {
      existing?.pause();
      transitionPhase('paused');
      return;
    }
    if (phase === 'paused' && existing && !existing.isDone()) {
      existing.start();
      transitionPhase('running');
      return;
    }
    if (phase === 'ready') {
      beginStream();
      return;
    }
    if (phase === 'completed') {
      autoStartAfterPrepare.current = true;
      prepareBaseline();
    }
  }, [beginStream, phase, prepareBaseline, transitionPhase]);
  const reset = useCallback(() => {
    autoStartAfterPrepare.current = false;
    prepareBaseline();
  }, [prepareBaseline]);
  const selectFixture = useCallback(
    (nextFixtureId: string) => {
      autoStartAfterPrepare.current = false;
      setFixtureId(nextFixtureId);
      prepareBaseline();
    },
    [prepareBaseline],
  );
  const setFps = useCallback((fps: number) => {
    setConfiguration((current) => {
      return {
        ...current,
        fps,
      };
    });
    streamer.current?.setFps(fps);
  }, []);
  const setSplitMode = useCallback(
    (mode: StreamConfiguration['mode']) => {
      autoStartAfterPrepare.current = false;
      setConfiguration((current) => {
        return {
          ...current,
          mode,
        };
      });
      prepareBaseline();
    },
    [prepareBaseline],
  );
  const setInstanceCount = useCallback(
    (count: 1 | 4) => {
      autoStartAfterPrepare.current = false;
      instanceCountRef.current = count;
      setInstanceCountState(count);
      prepareBaseline();
    },
    [prepareBaseline],
  );
  const onLegacySample = useCallback((sample: LegacySample) => {
    if (measurementActive.current) {
      collector.current.recordLegacy(sample);
    }
  }, []);
  const onIncrementalSample = useCallback((sample: IncrementalSample) => {
    if (measurementActive.current) {
      collector.current.recordIncremental(sample);
    }
  }, []);
  const onWorkerRequest = useCallback(() => {
    if (measurementActive.current) {
      collector.current.recordWorkerRequest();
    }
  }, []);
  const onCoalescedFrame = useCallback(() => {
    if (measurementActive.current) {
      collector.current.recordCoalescedFrame();
    }
  }, []);
  const onPatch = useCallback((result: PatchResult) => {
    if (!measurementActive.current) {
      return;
    }
    const entries = result.patches.map((patch) => {
      patchSequence.current += 1;
      return {
        baseRevision: result.baseRevision,
        block: describePatchBlock(patch),
        id: patchSequence.current,
        nextRevision: result.nextRevision,
        operation: patch.op,
        rendererId: result.rendererId,
        reqId: result.reqId,
      } satisfies PatchLogEntry;
    });
    if (entries.length === 0) {
      return;
    }
    setPatchLog((current) => {
      return [...entries, ...current].slice(0, MAX_PATCH_LOG_ENTRIES);
    });
  }, []);
  const onRuntimeStatus = useCallback(
    (instance: number, status: RuntimeStatus) => {
      if (measurementActive.current && status.mode === 'fallback') {
        collector.current.recordRuntimeFallback();
      }
      const nextStatuses = {
        ...runtimeStatusesRef.current,
        [instance]: status,
      };
      runtimeStatusesRef.current = nextStatuses;
      setRuntimeStatuses(nextStatuses);
      if (phaseRef.current !== 'preparing' || baselineLengthRef.current === 0) {
        return;
      }
      const instancesReady = Array.from({ length: instanceCountRef.current }, (_, index) => {
        return nextStatuses[index]?.committedContentLength === baselineLengthRef.current;
      }).every(Boolean);
      if (!instancesReady) {
        return;
      }
      clearMeasurements();
      transitionPhase('ready');
      if (autoStartAfterPrepare.current) {
        autoStartAfterPrepare.current = false;
        window.setTimeout(beginStream, 0);
      }
    },
    [beginStream, clearMeasurements, transitionPhase],
  );
  const injectWorkerFailure = useCallback(() => {
    setFailureSignal((current) => {
      return current + 1;
    });
  }, []);
  useEffect(() => {
    if (benchmarkBaseline.status !== 'ready') {
      return;
    }
    const timer = window.setTimeout(prepareBaseline, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [benchmarkBaseline.status, prepareBaseline]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setMetrics(collector.current.snapshot());
    }, 200);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    return () => {
      streamer.current?.pause();
      measurementActive.current = false;
    };
  }, []);
  return {
    actions: {
      injectWorkerFailure,
      onCoalescedFrame,
      onIncrementalSample,
      onLegacySample,
      onPatch,
      onRuntimeStatus,
      onWorkerRequest,
      reset,
      retryBaseline: benchmarkBaseline.retry,
      selectFixture,
      setFps,
      setInstanceCount,
      setSplitMode,
      togglePlayback,
    },
    activeFixture,
    state: {
      benchmark: {
        codeBlockCount: benchmarkBaseline.inspection?.codeBlockCount ?? 0,
        copyCount: benchmarkBaseline.copyCount,
        errorMessage: benchmarkBaseline.error?.message ?? '',
        phase: benchmarkBaseline.status === 'ready' ? phase : benchmarkBaseline.status,
        sourceCharacters: benchmarkBaseline.inspection?.characters ?? 0,
        status: benchmarkBaseline.status,
        totalCharacters: benchmarkBaseline.baseline.length,
      },
      configuration,
      content,
      failureSignal,
      fixtureId,
      instanceCount,
      isPlaying: benchmarkBaseline.status === 'ready' && phase === 'running',
      metrics,
      patchLog,
      runId,
      runtimeStatuses,
    },
  };
};
const describePatchBlock = (patch: PatchResult['patches'][number]): string => {
  if (patch.op === 'replaceRange') {
    return `@${patch.start} -${patch.deleteCount} +${patch.insertBlocks.length}`;
  }
  if (patch.op === 'tailAppendText') {
    return `#${patch.blockIndex} +${Array.from(patch.text).length}`;
  }
  return `#${patch.blockIndex} snapshot`;
};
