export const DEFAULT_CATEGORIES = {
  'Frame & Suspension': ['Frame', 'Rear Shock', 'Fork', 'Headset'],
  Drivetrain: [
    'Bottom Bracket',
    'Crankset',
    'Chainring(s)',
    'Pedals',
    'Front Derailleur',
    'Rear Derailleur',
    'Shifter(s)',
    'Cassette',
    'Chain',
  ],
  'Wheels & Tires': ['Wheelset', 'Tires', 'Tubes / Sealant'],
  Brakes: ['Brakes', 'Rotors'],
  'Cockpit & Touchpoints': [
    'Handlebar',
    'Stem',
    'Grips / Bar Tape',
    'Seatpost',
    'Seatpost Clamp',
    'Saddle',
  ],
  Other: ['Misc Hardware', 'Other / Misc'],
};

export const DEFAULT_CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORIES);

export function defaultItemsFor(category) {
  return DEFAULT_CATEGORIES[category] || [];
}
