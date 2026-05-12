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
        <h1 className="intro-hero">CAN YOU SELL IT LIKE MVP?</h1>
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
          The whistle won't blow itself. Earn it {faceCount} times. Certified MVP face by the end.
        </p>
        <button className="intro-cta" onClick={start}>
          EARN THE WHISTLE
        </button>
        <p className="intro-tip">Pro tip: screen-record this 🎥</p>
        <p className="intro-foot">Front camera required · No data stored</p>
      </div>
    </div>
  );
}
