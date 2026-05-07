export type Caricature = {
  id: string;
  label: string;
  emoji: string;
  target: Record<string, number>;
  weights?: Record<string, number>;
  threshold?: number;
};

export const PLACEHOLDER_CARICATURES: Caricature[] = [
  {
    id: 'shocked-disbelief',
    label: 'Shocked disbelief',
    emoji: '😱',
    target: {
      jawOpen: 0.4,
      eyeWideLeft: 0.25,
      eyeWideRight: 0.25,
      browInnerUp: 0.2,
    },
    weights: { jawOpen: 1.4, eyeWideLeft: 0.8, eyeWideRight: 0.8, browInnerUp: 0.6 },
  },
  {
    id: 'agony-grimace',
    label: 'Pure agony',
    emoji: '😖',
    target: {
      eyeSquintLeft: 0.45,
      eyeSquintRight: 0.45,
      mouthStretchLeft: 0.35,
      mouthStretchRight: 0.35,
      browDownLeft: 0.35,
      browDownRight: 0.35,
    },
    weights: {
      eyeSquintLeft: 1.2,
      eyeSquintRight: 1.2,
      mouthStretchLeft: 1,
      mouthStretchRight: 1,
      browDownLeft: 0.8,
      browDownRight: 0.8,
    },
  },
  {
    id: 'weary-groan',
    label: 'Weary groan',
    emoji: '😫',
    target: {
      jawOpen: 0.35,
      mouthStretchLeft: 0.3,
      mouthStretchRight: 0.3,
      browDownLeft: 0.3,
      browDownRight: 0.3,
    },
    weights: {
      jawOpen: 1.3,
      mouthStretchLeft: 1,
      mouthStretchRight: 1,
      browDownLeft: 0.8,
      browDownRight: 0.8,
    },
  },
  {
    id: 'clenched-strain',
    label: 'Clenched strain',
    emoji: '😣',
    target: {
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      mouthPressLeft: 0.3,
      mouthPressRight: 0.3,
      browInnerUp: 0.3,
    },
    weights: {
      eyeSquintLeft: 1.3,
      eyeSquintRight: 1.3,
      mouthPressLeft: 0.9,
      mouthPressRight: 0.9,
      browInnerUp: 0.6,
    },
  },
  {
    id: 'angry-glare',
    label: 'No-call rage',
    emoji: '😠',
    target: {
      browDownLeft: 0.5,
      browDownRight: 0.5,
      mouthPressLeft: 0.3,
      mouthPressRight: 0.3,
      noseSneerLeft: 0.25,
      noseSneerRight: 0.25,
    },
    weights: {
      browDownLeft: 1.2,
      browDownRight: 1.2,
      mouthPressLeft: 0.7,
      mouthPressRight: 0.7,
      noseSneerLeft: 0.5,
      noseSneerRight: 0.5,
    },
  },
  {
    id: 'puppy-eyes',
    label: 'Plead the call',
    emoji: '🥺',
    target: {
      browInnerUp: 0.55,
      mouthShrugLower: 0.4,
      mouthFrownLeft: 0.3,
      mouthFrownRight: 0.3,
    },
    weights: {
      browInnerUp: 1.3,
      mouthShrugLower: 1,
      mouthFrownLeft: 0.7,
      mouthFrownRight: 0.7,
    },
  },
  {
    id: 'smirk',
    label: 'Cool smirk',
    emoji: '😏',
    target: {
      mouthSmileLeft: 0.5,
      eyeSquintLeft: 0.3,
      cheekSquintLeft: 0.3,
    },
    weights: { mouthSmileLeft: 1.2, eyeSquintLeft: 1, cheekSquintLeft: 0.7 },
  },
  {
    id: 'kiss',
    label: 'Pucker',
    emoji: '😗',
    target: {
      mouthPucker: 0.55,
      mouthFunnel: 0.25,
    },
    weights: { mouthPucker: 1.4, mouthFunnel: 0.8 },
  },
];
