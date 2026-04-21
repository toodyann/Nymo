const ORION_DRIVE_SHOP_CARS = [
  {
    id: 'car_taxi',
    type: 'car',
    effect: 'taxi',
    title: 'Taxi Sprint',
    description: 'Класичне таксі з кращою видимістю у щільному трафіку.',
    price: 820,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/taxi.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/taxi.png', import.meta.url).href
  },
  {
    id: 'car_sedan_sports',
    type: 'car',
    effect: 'sedan-sports',
    title: 'Sedan Sports',
    description: 'Легка спортивна седан-платформа для маневрених заїздів.',
    price: 980,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/sedan-sports.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/sedan-sports.png', import.meta.url).href
  },
  {
    id: 'car_suv_luxury',
    type: 'car',
    effect: 'suv-luxury',
    title: 'SUV Luxury',
    description: 'Преміум SUV для стабільної їзди та важкого стилю.',
    price: 1260,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/suv-luxury.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/suv-luxury.png', import.meta.url).href
  },
  {
    id: 'car_police',
    type: 'car',
    effect: 'police',
    title: 'Interceptor',
    description: 'Поліцейський перехоплювач із агресивним силуетом.',
    price: 1490,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/police.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/police.png', import.meta.url).href
  },
  {
    id: 'car_race_future',
    type: 'car',
    effect: 'race-future',
    title: 'Race Future',
    description: 'Футуристичний болід для Nymo Drive.',
    price: 1740,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/race-future.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/race-future.png', import.meta.url).href
  },
  {
    id: 'car_firetruck',
    type: 'car',
    effect: 'firetruck',
    title: 'Firetruck XL',
    description: 'Пожежний важковаговик для нестандартного драйву.',
    price: 1980,
    assetSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/firetruck.glb', import.meta.url).href,
    previewSrc: new URL('../../../../Assets/NymoDrive/Сar-kit/Previews/firetruck.png', import.meta.url).href
  }
];

const ORION_DRIVE_CAR_PHYSICS_DEFAULT = {
  maxForward: 700,
  maxReverse: 260,
  forwardAccel: 360,
  reverseAccel: 360,
  transitionBrake: 760,
  shiftBrakeForce: 980
};

const ORION_DRIVE_CAR_PHYSICS = {
  taxi: {
    maxForward: 675,
    maxReverse: 245,
    forwardAccel: 338,
    reverseAccel: 330,
    transitionBrake: 750,
    shiftBrakeForce: 940
  },
  'sedan-sports': {
    maxForward: 735,
    maxReverse: 270,
    forwardAccel: 392,
    reverseAccel: 370,
    transitionBrake: 780,
    shiftBrakeForce: 1010
  },
  'suv-luxury': {
    maxForward: 655,
    maxReverse: 235,
    forwardAccel: 322,
    reverseAccel: 315,
    transitionBrake: 820,
    shiftBrakeForce: 1060
  },
  police: {
    maxForward: 770,
    maxReverse: 280,
    forwardAccel: 402,
    reverseAccel: 384,
    transitionBrake: 820,
    shiftBrakeForce: 1080
  },
  'race-future': {
    maxForward: 840,
    maxReverse: 292,
    forwardAccel: 438,
    reverseAccel: 396,
    transitionBrake: 860,
    shiftBrakeForce: 1120
  },
  firetruck: {
    maxForward: 595,
    maxReverse: 215,
    forwardAccel: 286,
    reverseAccel: 274,
    transitionBrake: 910,
    shiftBrakeForce: 1220
  }
};

const ORION_DRIVE_SMOKE_DEFAULT = {
  id: 'smoke_default',
  type: 'smoke',
  effect: '',
  title: 'Stock Smoke',
  description: 'Базовий сірий дим Nymo Drive.',
  price: 0,
  wheelColorHex: 0xaeb7c4,
  exhaustColorHex: 0xc5ccd8,
  burnoutColorHex: 0xdee5f0,
  previewColor: '#aeb7c4',
  previewAccent: '#dee5f0'
};

const ORION_DRIVE_SHOP_SMOKE_COLORS = [
  {
    id: 'smoke_ice',
    type: 'smoke',
    effect: 'ice',
    title: 'Ice Mist',
    description: 'Холодний блакитний шлейф для чистого ковзання.',
    price: 520,
    wheelColorHex: 0x82d8ff,
    exhaustColorHex: 0xb4eaff,
    burnoutColorHex: 0xe0f7ff,
    previewColor: '#82d8ff',
    previewAccent: '#e0f7ff'
  },
  {
    id: 'smoke_neon',
    type: 'smoke',
    effect: 'neon',
    title: 'Neon Pulse',
    description: 'Неоновий бірюзовий дим у стилі нічного міста.',
    price: 640,
    wheelColorHex: 0x3df2d0,
    exhaustColorHex: 0x7afbe4,
    burnoutColorHex: 0xc8fff3,
    previewColor: '#3df2d0',
    previewAccent: '#c8fff3'
  },
  {
    id: 'smoke_magenta',
    type: 'smoke',
    effect: 'magenta',
    title: 'Magenta Flow',
    description: 'Яскравий рожево-фіолетовий шлейф для ефектних заїздів.',
    price: 760,
    wheelColorHex: 0xf472dd,
    exhaustColorHex: 0xf8a3ea,
    burnoutColorHex: 0xffddf8,
    previewColor: '#f472dd',
    previewAccent: '#ffddf8'
  },
  {
    id: 'smoke_amber',
    type: 'smoke',
    effect: 'amber',
    title: 'Amber Burn',
    description: 'Теплий бурштиновий дим із виразним glow-ефектом.',
    price: 880,
    wheelColorHex: 0xffb347,
    exhaustColorHex: 0xffca77,
    burnoutColorHex: 0xffe2ad,
    previewColor: '#ffb347',
    previewAccent: '#ffe2ad'
  },
  {
    id: 'smoke_toxic',
    type: 'smoke',
    effect: 'toxic',
    title: 'Toxic Lime',
    description: 'Кислотний лаймовий дим для агресивного стилю їзди.',
    price: 980,
    wheelColorHex: 0x98ff5a,
    exhaustColorHex: 0xbdff87,
    burnoutColorHex: 0xe4ffc8,
    previewColor: '#98ff5a',
    previewAccent: '#e4ffc8'
  }
];

export {
  ORION_DRIVE_SHOP_CARS,
  ORION_DRIVE_CAR_PHYSICS_DEFAULT,
  ORION_DRIVE_CAR_PHYSICS,
  ORION_DRIVE_SMOKE_DEFAULT,
  ORION_DRIVE_SHOP_SMOKE_COLORS
};
