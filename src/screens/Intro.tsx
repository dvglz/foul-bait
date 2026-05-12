import { unlockAudio, preloadWhistle } from '../audio/whistle';

type Props = {
  onStart: () => void;
  faceCount: number;
};

export function Intro({ onStart, faceCount }: Props) {
  const start = () => {
    unlockAudio();
    void preloadWhistle();
    onStart();
  };

  return (
    <div className="intro">
      <div className="intro-inner">
        <h1 className="intro-hero">Are you MVP material?</h1>
        <video
          className="intro-loop"
          src="/intro-loop.mp4"
          autoPlay
          muted
          loop
          playsInline
          poster="/faces/Frame9.jpg"
        />
        <p className="intro-tagline">
          Mimic {faceCount} iconic foul-bait faces. Fastest clear wins.
        </p>
        <button className="intro-cta" onClick={start}>
          START
        </button>
        <p className="intro-tip">Pro tip: screen-record this 🎥</p>
        <p className="intro-foot">Front camera required · No data stored</p>
      </div>
    </div>
  );
}
