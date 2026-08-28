import { DancePoseDefinition } from '../../types/pose';

export const DANCE_POSES: DancePoseDefinition[] = [
  {
    id: 'aramandi',
    name: 'Aramandi (Ardhamandala / Ayata)',
    sanskritName: 'अर्धमण्डल (Aramandi / Half-Sit Stance)',
    danceFormIds: ['bharatanatyam', 'kuchipudi', 'mohiniyattam'],
    jointAngles: {
      leftKneeAngle: 120, // ~110-135 degrees flexion
      rightKneeAngle: 120,
      torsoInclination: 5, // vertical upright back
      hipAbduction: 45, // knees pointing outwards sideways
    },
    bodyRelations: {
      feetTurnedOut: 180, // heels together, toes outward
      thighsHorizontalProximity: 0.65,
    },
    stanceFeatures: {
      kneeFlexionLevel: 0.7,
      lateralSpread: 0.8,
      torsoUprightness: 0.95,
    },
    tolerance: {
      kneeAngle: 25,
      torsoAngle: 15,
      feetSpread: 0.25,
    },
    description: 'The iconic foundational diamond-shaped half-sitting posture where knees are bent outwards to either side, feet form a flat line with heels together, and spine remains strictly erect.',
    significance: 'Provides grounded stability and rhythmic elasticity for all Adavu foot strikes.',
    sources: [
      { title: 'Abhinaya Darpana of Nandikeshvara', sourceType: 'TRADITIONAL_TEXT', verified: true },
      { title: 'Natya Shastra (Mandala Sthanas)', sourceType: 'TRADITIONAL_TEXT', verified: true },
    ],
  },
  {
    id: 'samapada',
    name: 'Samapada / Samasthiti',
    sanskritName: 'समपाद (Natural Standing Equilibrium)',
    danceFormIds: ['bharatanatyam', 'kuchipudi', 'kathak', 'odissi', 'kathakali', 'mohiniyattam', 'manipuri', 'sattriya'],
    jointAngles: {
      leftKneeAngle: 175,
      rightKneeAngle: 175,
      torsoInclination: 2,
      shoulderAngle: 0,
    },
    bodyRelations: {
      feetTogetherDistance: 0.08,
      shouldersLevel: 0.95,
    },
    stanceFeatures: {
      kneeFlexionLevel: 0.05,
      lateralSpread: 0.15,
      torsoUprightness: 0.98,
    },
    tolerance: {
      kneeAngle: 15,
      torsoAngle: 10,
    },
    description: 'Standing straight and tall with feet placed symmetrically together or slightly parallel, shoulders relaxed and even, hands in Dola Hasta or chest level.',
    significance: 'Represents balance, baseline equilibrium before initiating motion.',
    sources: [{ title: 'Natya Shastra Chapter 10 (Sthanas)', sourceType: 'TRADITIONAL_TEXT', verified: true }],
  },
  {
    id: 'natarajasana',
    name: 'Natarajasana (Bhujangatrasita Karana)',
    sanskritName: 'भुजङ्गत्रासित (Cosmic Dance of Shiva)',
    danceFormIds: ['bharatanatyam', 'kuchipudi', 'odissi'],
    jointAngles: {
      standingKneeAngle: 135, // slightly bent standing leg
      raisedKneeAngle: 75, // lifted leg bent sharply across body
      raisedHipAngle: 90,
      torsoInclination: 10,
    },
    bodyRelations: {
      raisedFootAcrossCenterline: 0.85,
      leftArmDandaHastaCrossing: 0.8,
      rightArmAbhayaRaised: 0.9,
    },
    stanceFeatures: {
      asymmetricLegLift: 0.9,
      cosmicCrossArm: 0.85,
    },
    tolerance: {
      kneeAngle: 30,
      raisedLegAngle: 30,
    },
    description: 'The supreme Ananda Tandava stance of Lord Nataraja at Chidambaram. The left foot is lifted across the right knee in graceful suspension, right hand raised in Abhaya Pataka, left arm sweeping diagonally in Gajahasta/Dandahasta across the chest.',
    significance: 'Portrays the Panchakrityas: Creation (Damaru), Protection (Abhaya), Destruction (Agni), Illusion (Tirobhava), and Liberation (Anugraha).',
    sources: [
      { title: 'Chidambaram Temple Karana Sculptural Inscriptions', sourceType: 'ARCHIVE', verified: true },
      { title: 'Natya Shastra Karana 24 (Bhujangatrasita)', sourceType: 'TRADITIONAL_TEXT', verified: true },
    ],
  },
  {
    id: 'tribhanga',
    name: 'Tribhanga (Three-Bend Stance)',
    sanskritName: 'त्रिभङ्ग (Three Curves of Grace)',
    danceFormIds: ['odissi'],
    jointAngles: {
      kneeDeflection: 30,
      hipOffsetAngle: 25,
      neckDeflection: 20,
    },
    bodyRelations: {
      headTiltOppositeTorso: 0.85,
      torsoShiftOppositeHip: 0.9,
    },
    stanceFeatures: {
      threeCurveWave: 0.92,
      bodySinuousity: 0.88,
    },
    tolerance: {
      hipOffset: 0.3,
      torsoShift: 0.25,
    },
    description: 'The quintessential Odissi posture characterized by three distinct bends in the body: one at the neck, one at the waist/hips, and one at the knees, creating an exquisite S-curve reminiscent of ancient Konark temple sculptures.',
    significance: 'Embodiment of the Lasya aesthetic and divine feminine grace.',
    sources: [
      { title: 'Abhinaya Chandrika (Maheshwara Mahapatra)', sourceType: 'TRADITIONAL_TEXT', verified: true },
      { title: 'Konark Sun Temple & Jagannath Puri Natamandira Sculptural Relatives', sourceType: 'ARCHIVE', verified: true },
    ],
  },
  {
    id: 'chowka',
    name: 'Chowka (Square Stance)',
    sanskritName: 'चौक (Square Mandala of Lord Jagannath)',
    danceFormIds: ['odissi'],
    jointAngles: {
      leftKneeAngle: 110,
      rightKneeAngle: 110,
      elbowAngle: 90,
      shoulderAngle: 90,
    },
    bodyRelations: {
      feetTurnedOutSquare: 0.85,
      forearmsParallelHorizon: 0.9,
    },
    stanceFeatures: {
      squareSymmetry: 0.95,
      wideStanceWeight: 0.85,
    },
    tolerance: {
      kneeAngle: 25,
      elbowAngle: 20,
    },
    description: 'A wide, masculine, square stance honoring Lord Jagannath, where knees are bent widely apart to form a square with the pelvis, and both arms are bent at right angles at shoulder level.',
    significance: 'Symbolizes the cosmic four-cornered balance of Lord Jagannath.',
    sources: [{ title: 'Odissi Nrutya Shastra & Guru Kelucharan Mohapatra Tradition', sourceType: 'ACADEMIC', verified: true }],
  },
  {
    id: 'alidha',
    name: 'Alidha Sthana (Warrior Stance)',
    sanskritName: 'आलीढ (Heroic Archer Stance)',
    danceFormIds: ['bharatanatyam', 'kuchipudi', 'kathakali', 'chhau', 'odissi'],
    jointAngles: {
      frontKneeAngle: 105,
      backKneeAngle: 165,
      torsoInclination: 12,
    },
    bodyRelations: {
      legFrontBackDistance: 0.55,
      armDrawingBow: 0.85,
    },
    stanceFeatures: {
      lungeAsymmetry: 0.88,
      warriorExtension: 0.9,
    },
    tolerance: {
      kneeAngle: 25,
      stanceLength: 0.2,
    },
    description: 'A bold heroic warrior stance where one leg is bent deep forward in a lunge while the back leg extends long behind, torso tilted forward holding an imaginary bow and arrow.',
    significance: 'Used in depicting Rama, Arjuna, Durga battling demons.',
    sources: [{ title: 'Natya Shastra Chapter 10 (Sthanas)', sourceType: 'TRADITIONAL_TEXT', verified: true }],
  },
  {
    id: 'kathak_thaat',
    name: 'Kathak Thaat (Upright Grace)',
    sanskritName: 'ठाट (Elegance & Readiness)',
    danceFormIds: ['kathak'],
    jointAngles: {
      leftKneeAngle: 175,
      rightKneeAngle: 175,
      leftArmAngle: 120,
      rightArmAngle: 90,
    },
    bodyRelations: {
      oneHandOverheadOneSideways: 0.88,
      gentleTorsoBreathe: 0.8,
    },
    stanceFeatures: {
      subtleGrace: 0.9,
      wristFlow: 0.85,
    },
    tolerance: {
      armAngle: 25,
      kneeAngle: 15,
    },
    description: 'The elegant opening posture of Kathak where the dancer stands erect with micro-movements of eyes, eyebrows, wrists, and shoulders, one arm raised above the head in an arch and the other extended sideways.',
    significance: 'Establishes the subtle rhythmic mood (Laya) and aesthetic composure.',
    sources: [{ title: 'Kathak Shastra (Lucknow & Jaipur Traditions)', sourceType: 'ACADEMIC', verified: true }],
  },
  {
    id: 'kathakali_mandalam',
    name: 'Kathakali Mandalam (Kalaripayattu Base)',
    sanskritName: 'मण्डलं (Deep Square Base)',
    danceFormIds: ['kathakali'],
    jointAngles: {
      leftKneeAngle: 95,
      rightKneeAngle: 95,
      feetOuterEdgesResting: 0.85,
    },
    bodyRelations: {
      feetSpreadWide: 0.65,
      palmsRestingOnWaist: 0.8,
    },
    stanceFeatures: {
      deepMartialFlexion: 0.92,
      archedSpine: 0.85,
    },
    tolerance: {
      kneeAngle: 25,
      feetSpread: 0.25,
    },
    description: 'Deep wide-set martial squat rooted in Kalaripayattu, standing on the outer edges of curved feet with deeply arched lower back and chest puffed proudly forward.',
    significance: 'Provides the immense kinetic base required for heavy headgear and dynamic expressions.',
    sources: [{ title: 'Kerala Kalamandalam Kathakali Manual', sourceType: 'ACADEMIC', verified: true }],
  },
  {
    id: 'bhangra_high_leap',
    name: 'Bhangra Jhummar High-Step',
    sanskritName: 'भांगड़ा उछाल (High Energy Folk Stride)',
    danceFormIds: ['bhangra'],
    jointAngles: {
      standingKneeAngle: 140,
      raisedKneeAngle: 70, // knee lifted high toward chest
      leftElbowAngle: 75,
      rightElbowAngle: 75,
    },
    bodyRelations: {
      bothArmsRaisedV: 0.9,
      kneeElevatedHigh: 0.85,
    },
    stanceFeatures: {
      folkElevation: 0.95,
      exuberantSymmetry: 0.9,
    },
    tolerance: {
      kneeLift: 0.3,
      armElevation: 0.25,
    },
    description: 'High-energy celebratory leap with one knee lifted high toward the torso, both arms raised in a wide triumphant V overhead with shaking shoulders.',
    significance: 'Celebration of the golden wheat harvest (Baisakhi) in Punjab.',
    sources: [{ title: 'Punjab Sangeet Natak Akademi Folk Dance Archive', sourceType: 'GOVERNMENT', verified: true }],
  },
  {
    id: 'garba_turn_stance',
    name: 'Garba Chapti Step (Circular Dip)',
    sanskritName: 'गरबा चक्र (Circular Clap Dip)',
    danceFormIds: ['garba', 'dandiya_raas'],
    jointAngles: {
      torsoInclination: 25, // lateral/forward bow
      kneeFlexion: 130,
      clapHandContact: 0.9,
    },
    bodyRelations: {
      handsClappingAtSide: 0.88,
      bodySpiralTwist: 0.82,
    },
    stanceFeatures: {
      spiralDip: 0.85,
      clapRhythm: 0.9,
    },
    tolerance: {
      torsoAngle: 20,
      kneeAngle: 25,
    },
    description: 'Circular rhythmic step with a graceful torso dip and hands clapping synchronously to the right or left of the body in circular rotation around the sacred lamp (Garbha Deep).',
    significance: 'Devotional celebration of Goddess Amba during Navratri.',
    sources: [{ title: 'Gujarat State Sangeet Natak Akademi Folk Traditions', sourceType: 'GOVERNMENT', verified: true }],
  },
];
