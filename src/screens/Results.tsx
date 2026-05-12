import { useEffect, useMemo, useState } from 'react';
import { PLACEHOLDER_CARICATURES } from '../game/caricatures';
import type { RunResult } from '../game/run';
import { getFrame } from '../capture/whistleFrameStore';
import { renderGrid, type GridTile } from '../capture/gridRenderer';
import { formatTime, shareRun } from '../share/share';
import { clutchPlay, type LeaderboardRow } from '../platform/clutchPlay';

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

  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);
  const [you, setYou] = useState<LeaderboardRow | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'rendering' | 'shared' | 'downloaded' | 'error'>('idle');

  useEffect(() => {
    void clutchPlay.getLeaderboard().then(setBoard);
    void clutchPlay.getYouRow(result.totalMs).then(setYou);
  }, [result.totalMs]);

  const onShare = async () => {
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
    } catch (e) {
      console.error(e);
      setShareState('error');
    }
  };

  const onClaim = () => {
    void clutchPlay.submitScore(result.totalMs);
    const returnUrl = `${window.location.origin}/?score=${result.totalMs}`;
    clutchPlay.signIn(returnUrl);
  };

  return (
    <div className="results">
      <div className="results-inner">
        <div className="results-msg">Run complete</div>
        <div className="results-time">{formatTime(result.totalMs)}</div>
        <div className="results-clean">
          {cleanCount}/{totalCount} clean
        </div>

        <div className="results-grid">
          {tiles.map((t) => (
            <div key={t.id} className={`results-tile ${t.missed ? 'results-tile--missed' : ''}`}>
              <div className="results-tile-target">
                {t.targetSrc ? <img src={t.targetSrc} alt="" /> : null}
              </div>
              <div className="results-tile-player">
                {t.playerSrc ? <img src={t.playerSrc} alt="" /> : <div className="results-tile-empty" />}
                {t.missed && <div className="results-tile-x">✕</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="results-board">
          <div className="results-board-title">Leaderboard preview</div>
          {board?.map((r) => (
            <div key={r.rank} className="results-board-row">
              <span className="results-board-rank">#{r.rank}</span>
              <span className="results-board-name">{r.name}</span>
              <span className="results-board-time">{formatTime(r.timeMs)}</span>
            </div>
          ))}
          {you && (
            <div className="results-board-row results-board-row--you">
              <span className="results-board-rank">#{you.rank}</span>
              <span className="results-board-name">YOU</span>
              <span className="results-board-time">{formatTime(you.timeMs)}</span>
            </div>
          )}
        </div>

        <div className="results-cta">
          <button onClick={onShare} disabled={shareState === 'rendering'}>
            {shareState === 'rendering'
              ? 'Rendering…'
              : shareState === 'downloaded'
              ? 'Downloaded ✓'
              : shareState === 'shared'
              ? 'Shared ✓'
              : 'Share'}
          </button>
          <button onClick={onClaim} className="results-cta-claim">
            Claim your spot →
          </button>
        </div>

        <button className="results-replay" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
