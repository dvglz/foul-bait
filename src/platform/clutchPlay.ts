export type LeaderboardRow = {
  rank: number;
  name: string;
  timeMs: number;
  isYou?: boolean;
};

export interface ClutchPlay {
  signIn(returnUrl: string): void;
  submitScore(timeMs: number): Promise<void>;
  getLeaderboard(): Promise<LeaderboardRow[]>;
  getYouRow(timeMs: number): Promise<LeaderboardRow>;
}

const STUB_BOARD: Omit<LeaderboardRow, 'rank'>[] = [
  { name: 'kobeFan24', timeMs: 38120 },
  { name: 'flopGod', timeMs: 41008 },
  { name: 'whistleblowR', timeMs: 43511 },
  { name: 'tippy_toes', timeMs: 47220 },
  { name: 'fakeOut', timeMs: 49901 },
];

export const clutchPlay: ClutchPlay = {
  signIn(returnUrl: string) {
    console.warn('[clutchPlay] sign-in stub. returnUrl=', returnUrl);
    window.location.href = returnUrl;
  },
  async submitScore(timeMs: number) {
    localStorage.setItem('foulbait.lastScoreMs', String(timeMs));
  },
  async getLeaderboard() {
    return STUB_BOARD.slice(0, 3).map((r, i) => ({ ...r, rank: i + 1 }));
  },
  async getYouRow(timeMs: number) {
    const all = [...STUB_BOARD, { name: 'YOU', timeMs }].sort((a, b) => a.timeMs - b.timeMs);
    const idx = all.findIndex((r) => r.name === 'YOU' && r.timeMs === timeMs);
    return { ...all[idx], rank: idx + 1, isYou: true };
  },
};
