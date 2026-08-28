import { MovementDefinition } from '../../types/movement';

export const DANCE_MOVEMENTS: MovementDefinition[] = [
  {
    id: 'kathak_tatkar',
    name: 'Tatkar (Rhythmic Footwork)',
    sanskritName: 'तत्कार (Ta-Thei-Thei-Tat Footwork)',
    danceFormIds: ['kathak'],
    characteristicDurationMs: 1200,
    description: 'Rapid, precise flat-footed alternate stamping of feet producing crisp rhythmic patterns in harmony with Ghungroos and Tabla bols.',
    featureSignature: {
      minFootCadence: 2.2, // fast steps/sec
      minVerticalOscillation: 0.1,
      prominentJoints: ['left_ankle', 'right_ankle', 'left_knee', 'right_knee'],
    },
  },
  {
    id: 'kathak_chakkar',
    name: 'Chakkar (Fast Pirouette / Spin)',
    sanskritName: 'चक्कर (Spiritual Revolutions)',
    danceFormIds: ['kathak'],
    characteristicDurationMs: 1500,
    description: 'Rapid continuous full-body pirouettes executed with lightning speed and halted sharply into a motionless Thaat pose.',
    featureSignature: {
      minRotationRate: 180, // deg/sec
      minVelocity: 0.45,
      prominentJoints: ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'],
    },
  },
  {
    id: 'adavu_kudittu_mettu',
    name: 'Kudittu Mettu Adavu (Jump & Stamp)',
    sanskritName: 'कुदित्तु मेत्तु (Jump on Toes & Stamp Heel)',
    danceFormIds: ['bharatanatyam', 'kuchipudi'],
    characteristicDurationMs: 1400,
    description: 'Jumping lightly onto the balls of both feet in Aramandi, followed immediately by a sharp decisive heel stamp while arms articulate in Tripataka or Alapadma.',
    featureSignature: {
      minVerticalOscillation: 0.35,
      minFootCadence: 1.5,
      prominentJoints: ['left_ankle', 'right_ankle', 'left_knee', 'right_knee', 'left_wrist', 'right_wrist'],
    },
  },
  {
    id: 'adavu_tatti_metti',
    name: 'Tatti Metti Adavu (Alternate Step & Heel)',
    sanskritName: 'तट्टि मेट्टि (Stamp and Strike)',
    danceFormIds: ['bharatanatyam', 'kuchipudi'],
    characteristicDurationMs: 1600,
    description: 'Rhythmic sequence striking the ball of the foot followed by the heel in Jaati counts (Ta Ka Dhi Mi), with side-to-side torso breathing.',
    featureSignature: {
      minFootCadence: 1.8,
      minVerticalOscillation: 0.2,
      prominentJoints: ['left_ankle', 'right_ankle', 'left_hip', 'right_hip'],
    },
  },
  {
    id: 'odissi_tribhanga_shift',
    name: 'Tribhanga Bhangi Shift (Torso Wave)',
    sanskritName: 'त्रिभङ्ग संचार (Sculptural S-Curve Wave)',
    danceFormIds: ['odissi'],
    characteristicDurationMs: 2000,
    description: 'Smooth, lyrical shift of body weight from left Tribhanga to right Tribhanga with delicate lateral torso deflection (Bhanga) and neck movement (Greeva Bheda).',
    featureSignature: {
      minVelocity: 0.15,
      prominentJoints: ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'nose'],
    },
  },
  {
    id: 'bhangra_dhamaal_bounce',
    name: 'Bhangra Dhamaal (High Energy Leap & Clap)',
    sanskritName: 'धमाल (Harvest Celebration Bounce)',
    danceFormIds: ['bhangra'],
    characteristicDurationMs: 1000,
    description: 'Explosive vertical jumps on alternate legs accompanied by energetic overhead arm pumps, shoulder shimmies, and vocal shouts (Hoye Hoye!).',
    featureSignature: {
      minVerticalOscillation: 0.6,
      minVelocity: 0.7,
      prominentJoints: ['left_knee', 'right_knee', 'left_shoulder', 'right_shoulder'],
    },
  },
  {
    id: 'garba_heench_swirl',
    name: 'Garba Heench (Two-Clap / Three-Clap Swirl)',
    sanskritName: 'हिंच (Navratri Circular Clap Wave)',
    danceFormIds: ['garba', 'dandiya_raas'],
    characteristicDurationMs: 1200,
    description: 'Flowing circular synchronized dance step with sudden graceful dips, spinning 180 degrees and clapping hands rhythmically with partners.',
    featureSignature: {
      minRotationRate: 90,
      minVerticalOscillation: 0.3,
      prominentJoints: ['left_wrist', 'right_wrist', 'left_hip', 'right_hip'],
    },
  },
  {
    id: 'kathakali_thiranokku',
    name: 'Kathakali Thiranokku (Curtain Look & Stride)',
    sanskritName: 'तिरानोक्कु (Dramatic Heroic Reveal Stride)',
    danceFormIds: ['kathakali'],
    characteristicDurationMs: 2500,
    description: 'Heavy, majestic stamping steps in deep Mandalam, pulling down the traditional curtain (Tirassila) with fierce facial quivering and rolling eyeballs.',
    featureSignature: {
      minVelocity: 0.25,
      minVerticalOscillation: 0.25,
      prominentJoints: ['left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'nose'],
    },
  },
  {
    id: 'bihu_komor_sway',
    name: 'Bihu Komor (Rapid Waist & Wrist Flutter)',
    sanskritName: 'बिहु कमर दोलन (Assamese Spring Rhythm)',
    danceFormIds: ['bihu'],
    characteristicDurationMs: 1100,
    description: 'Brisk, joyful swaying of hips and lower torso with soft, rapid wrist flutters at chest level celebrating the Rongali Bihu Assamese new year.',
    featureSignature: {
      minVelocity: 0.4,
      minFootCadence: 2.0,
      prominentJoints: ['left_hip', 'right_hip', 'left_wrist', 'right_wrist'],
    },
  },
];
