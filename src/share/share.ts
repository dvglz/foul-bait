export function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const mss = Math.floor(ms % 1000);
  return `${m}:${s.toString().padStart(2, '0')}.${mss.toString().padStart(3, '0')}`;
}

export function shareText(timeMs: number): string {
  return `I scored ${formatTime(timeMs)} on Foul Bait. Bet you can't beat me → https://foul-bait.com`;
}

type SharePayload = {
  blob: Blob;
  filename: string;
  timeMs: number;
};

export async function shareRun({ blob, filename, timeMs }: SharePayload): Promise<'shared' | 'downloaded'> {
  void timeMs;
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  // iOS quirk: sharing `files` + `text` together causes the Copy action to
  // place BOTH on the pasteboard. Pasting then yields the image *and* a link
  // preview card from the text — visually a duplicate. File-only avoids that.
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch {
      // fall through to download
    }
  }
  download(blob, filename);
  return 'downloaded';
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
