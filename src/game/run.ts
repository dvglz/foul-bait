export type RoundResult = {
  caricatureId: string;
  timeMs: number;
  missed: boolean;
};

export type RunResult = {
  totalMs: number;
  rounds: RoundResult[];
};
