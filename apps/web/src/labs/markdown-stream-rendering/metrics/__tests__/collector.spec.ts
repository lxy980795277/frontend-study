import { MarkdownMetricsCollector } from '../collector';

describe('MarkdownMetricsCollector', () => {
  it('measures only the active run window and freezes elapsed time on finish', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      return now;
    });

    const collector = new MarkdownMetricsCollector();
    expect(collector.snapshot().elapsedMs).toBe(0);

    collector.start();
    now = 145;
    expect(collector.snapshot().elapsedMs).toBe(45);

    collector.finish();
    now = 300;
    expect(collector.snapshot().elapsedMs).toBe(45);
  });

  it('keeps main-thread, Worker and patch metrics in separate fields', () => {
    const collector = new MarkdownMetricsCollector();
    collector.recordLegacy({ mainMs: 8 });
    collector.recordIncremental({
      applyMs: 2,
      diffMs: 1.5,
      mountMs: 1,
      parseMs: 3,
      patchOps: ['tailAppendText', 'tailAppendFallbackHtml'],
      usedSnapshotFallback: false,
    });

    const snapshot = collector.snapshot();

    expect(snapshot.legacy.mainTotalMs).toBe(8);
    expect(snapshot.incremental.mainTotalMs).toBe(3);
    expect(snapshot.incremental.applyMs).toBe(2);
    expect(snapshot.incremental.mountMs).toBe(1);
    expect(snapshot.incremental.workerParseMs).toBe(3);
    expect(snapshot.incremental.workerDiffMs).toBe(1.5);
    expect(snapshot.incremental.tailAppendRate).toBe(0.5);
    expect(snapshot.incremental.fallbackPatchRate).toBe(0.5);
  });
});
