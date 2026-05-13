import { useEffect } from 'react';
import { unlockAudio, preloadWhistle } from '../audio/whistle';
import { track } from '../analytics/track';

type Props = {
  onStart: () => void;
  faceCount: number;
};

export function Intro({ onStart, faceCount }: Props) {
  useEffect(() => {
    track('intro_view', { face_count: faceCount });
  }, [faceCount]);

  const start = () => {
    track('start_click', { face_count: faceCount });
    unlockAudio();
    void preloadWhistle();
    onStart();
  };

  return (
    <div className="intro">
      <div className="intro-inner">
        <h1 className="intro-hero">
          <span>CAN YOU SELL IT</span>
          <span className="intro-hero-accent">LIKE AN MVP?</span>
        </h1>

        <div className="intro-hero-row">
          <div className="intro-hero-card">
            <img src="/faces/04_2026-03-24T014524Z_1937861792_MT1USATODAY28572280_RTRMADP_3_NBA-OKLAHOMA-CITY-THUNDER-AT-PHILADELPHIA-76ERS 1.jpg" alt="" />
          </div>
          <div className="intro-hero-card">
            <img src="/faces/image-user.jpg" alt="" />
          </div>
        </div>

        <p className="intro-tagline">
          The whistle won't blow itself. Earn it {faceCount} times. Certified MVP face by the end.
        </p>

        <button className="intro-cta" onClick={start}>
          Earn the whistle
        </button>

        <p className="intro-tip">🤳 Screen record on. Silent mode off.</p>
        <p className="intro-foot">
          Selfie Cam required. No data stored. Just for laughs. Not affiliated with or endorsed by
          any athlete or league.
        </p>
      </div>
    </div>
  );
}
