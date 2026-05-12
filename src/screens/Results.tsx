import { useMemo, useState } from 'react';
import { PLACEHOLDER_CARICATURES } from '../game/caricatures';
import type { RunResult } from '../game/run';
import { getFrame } from '../capture/whistleFrameStore';
import { renderGrid, type GridTile } from '../capture/gridRenderer';
import { formatTime, shareRun } from '../share/share';
import { track } from '../analytics/track';

const CLUTCH_PLAY_URL = 'https://play.clutchpoints.com/?src=mvp-material';

type Props = {
  result: RunResult;
  onPlayAgain: () => void;
};

export function Results({ result, onPlayAgain }: Props) {
  const cleanCount = result.rounds.filter((r) => !r.missed).length;
  const totalCount = result.rounds.length;

  const tiles = useMemo<GridTile[]>(
    () =>
      result.rounds.map((r) => {
        const c = PLACEHOLDER_CARICATURES.find((x) => x.id === r.caricatureId)!;
        return {
          id: r.caricatureId,
          label: c.label,
          targetSrc: c.photo ?? '',
          playerSrc: getFrame(r.caricatureId),
          missed: r.missed,
        };
      }),
    [result],
  );

  const [shareState, setShareState] = useState<'idle' | 'rendering' | 'shared' | 'downloaded' | 'error'>(
    'idle',
  );

  const onShare = async () => {
    track('share_click', {
      total_ms: Math.round(result.totalMs),
      clean_count: cleanCount,
      total_count: totalCount,
    });
    setShareState('rendering');
    try {
      const blob = await renderGrid({
        tiles,
        timeMs: result.totalMs,
        cleanCount,
        totalCount,
      });
      const status = await shareRun({
        blob,
        filename: `foul-bait-${formatTime(result.totalMs).replace(/[:.]/g, '-')}.png`,
        timeMs: result.totalMs,
      });
      setShareState(status);
      track('share_result', { status });
    } catch (e) {
      console.error(e);
      setShareState('error');
      track('share_result', { status: 'error' });
    }
  };

  return (
    <div className="results">
      <div className="results-inner">
        <p className="results-brand results-fade" style={{ animationDelay: '0ms' }}>
          CAN YOU SELL IT
          <br />
          LIKE AN MVP?
        </p>
        <p className="results-runtime results-fade" style={{ animationDelay: '80ms' }}>
          Run completed in {formatTime(result.totalMs)}
        </p>
        <h2 className="results-cleared results-fade" style={{ animationDelay: '160ms' }}>
          Cleared {cleanCount}/{totalCount}!
        </h2>

        <div className="results-grid">
          {tiles.map((t, i) => (
            <div
              key={t.id}
              className={`results-pair results-fade ${t.missed ? 'results-pair--missed' : ''}`}
              style={{ animationDelay: `${240 + i * 70}ms` }}
            >
              <div className="results-cell results-cell--target">
                {t.targetSrc ? <img src={t.targetSrc} alt="" /> : null}
              </div>
              <div className="results-cell results-cell--player">
                {t.playerSrc ? <img src={t.playerSrc} alt="" /> : <div className="results-cell-empty" />}
                {t.missed && <div className="results-cell-x" aria-hidden>✕</div>}
              </div>
            </div>
          ))}
        </div>

        <button
          className="results-btn results-btn--primary results-fade"
          style={{ animationDelay: `${240 + tiles.length * 70 + 60}ms` }}
          onClick={onShare}
          disabled={shareState === 'rendering'}
        >
          {shareState === 'rendering'
            ? 'Rendering…'
            : shareState === 'downloaded'
            ? 'Downloaded ✓'
            : shareState === 'shared'
            ? 'Shared ✓'
            : 'Share'}
        </button>
        <button
          className="results-btn results-btn--secondary results-fade"
          style={{ animationDelay: `${240 + tiles.length * 70 + 130}ms` }}
          onClick={onPlayAgain}
        >
          Play Again
        </button>

        <p
          className="results-more results-fade"
          style={{ animationDelay: `${240 + tiles.length * 70 + 200}ms` }}
        >
          More Games at{' '}
          <a
            href={CLUTCH_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('clutchplay_click')}
          >
            Clutch Play →
          </a>
        </p>
      </div>
    </div>
  );
}
