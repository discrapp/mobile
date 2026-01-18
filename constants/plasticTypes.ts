/**
 * Plastic types by manufacturer for disc golf discs.
 * Used to populate the plastic dropdown based on selected manufacturer.
 */

export const PLASTIC_TYPES: Record<string, string[]> = {
  Innova: [
    'Star',
    'Champion',
    'GStar',
    'DX',
    'Pro',
    'R-Pro',
    'KC Pro',
    'JK Pro',
    'XT',
    'Nexus',
    'Luster',
    'Metal Flake',
    'Glow',
    'Halo Star',
    'Color Glow',
    'Blizzard Champion',
    'Echo Star',
    'Factory Second',
  ],
  Discraft: [
    'ESP',
    'Z',
    'Big Z',
    'Titanium',
    'Jawbreaker',
    'Pro-D',
    'X',
    'Cryztal',
    'Cryztal FLX',
    'FLX',
    'ESP FLX',
    'Z FLX',
    'Metallic Z',
    'Swirl ESP',
    'Glo Z',
    'Rubber Blend',
  ],
  'Dynamic Discs': [
    'Lucid',
    'Fuzion',
    'Prime',
    'Classic',
    'Lucid-X',
    'Fuzion-X',
    'Lucid Air',
    'Moonshine',
    'Chameleon',
    'Fluid',
  ],
  Latitude64: [
    'Opto',
    'Gold',
    'Retro',
    'Zero',
    'Opto-X',
    'Gold-X',
    'Opto Air',
    'Frost',
    'Moonshine',
    'Opto Glimmer',
    'Royal',
    'Grand',
  ],
  Westside: [
    'VIP',
    'Tournament',
    'Origio',
    'BT',
    'VIP-X',
    'Tournament-X',
    'VIP Air',
    'Moonshine',
    'Elasto',
  ],
  MVP: [
    'Neutron',
    'Proton',
    'Electron',
    'Plasma',
    'Fission',
    'Cosmic Neutron',
    'Cosmic Electron',
    'Eclipse',
    'Total Eclipse',
  ],
  Axiom: [
    'Neutron',
    'Proton',
    'Electron',
    'Plasma',
    'Fission',
    'Cosmic Neutron',
    'Cosmic Electron',
    'Eclipse',
    'Total Eclipse',
  ],
  Streamline: [
    'Neutron',
    'Proton',
    'Electron',
    'Plasma',
    'Cosmic Neutron',
    'Cosmic Electron',
  ],
  Thought: [
    'Aura',
    'Ethos',
    'Nerve',
    'Synapse',
    'Origin',
  ],
  Discmania: [
    'S-Line',
    'C-Line',
    'P-Line',
    'D-Line',
    'G-Line',
    'Neo',
    'Evolution',
    'Exo',
    'Lux',
    'Horizon',
    'Forge',
    'Vapor',
  ],
  Kastaplast: [
    'K1',
    'K1 Soft',
    'K1 Glow',
    'K2',
    'K3',
    'K3 Hard',
  ],
  Prodigy: [
    '400',
    '400G',
    '400S',
    '350G',
    '350',
    '300',
    '300 Soft',
    '200',
    '500',
    '750',
    '750G',
    'Pro Flex',
  ],
  'Infinite Discs': [
    'I-Blend',
    'S-Blend',
    'C-Blend',
    'D-Blend',
    'G-Blend',
    'Metal Flake',
    'Glow',
    'Swirl S-Blend',
  ],
  Legacy: [
    'Icon',
    'Pinnacle',
    'Excel',
    'Protege',
    'Gravity',
  ],
  Gateway: [
    'Diamond',
    'Platinum',
    'Suregrip',
    'Eraser',
    'Organic',
    'Evolution',
    'Hyper Diamond',
  ],
  DGA: [
    'Proline',
    'SP Line',
    'D-Line',
    'Signature',
    'Glow',
  ],
  'Clash Discs': [
    'Steady',
    'Hardy',
    'Softy',
  ],
  Mint: [
    'Apex',
    'Sublime',
    'Eternal',
    'Royal',
  ],
  TSA: [
    'Ethos',
    'Aura',
    'Nerve',
    'Ethereal',
    'Glow',
  ],
  Loft: [
    'Alpha-Solid',
    'Beta-Solid',
    'Gamma-Solid',
    '𝛼-Solid',
    '𝛽-Solid',
  ],
  RPM: [
    'Atomic',
    'Cosmic',
    'Strata',
    'Magma',
  ],
  Viking: [
    'Storm',
    'Armor',
    'Ground',
  ],
  Yikun: [
    'Dragon',
    'Phoenix',
    'Tiger',
  ],
  Divergent: [
    'Max Grip',
    'Stayput',
  ],
};

/**
 * Disc categories/types
 */
export const DISC_CATEGORIES = [
  'Distance Driver',
  'Control Driver',
  'Hybrid Driver',
  'Fairway Driver',
  'Midrange',
  'Putter',
  'Approach',
];

/**
 * Get plastic types for a manufacturer (case-insensitive lookup)
 */
export function getPlasticTypes(manufacturer: string): string[] {
  // Try exact match first
  if (PLASTIC_TYPES[manufacturer]) {
    return PLASTIC_TYPES[manufacturer];
  }

  // Try case-insensitive match
  const lowerManufacturer = manufacturer.toLowerCase();
  for (const [key, value] of Object.entries(PLASTIC_TYPES)) {
    if (key.toLowerCase() === lowerManufacturer) {
      return value;
    }
  }

  return [];
}
