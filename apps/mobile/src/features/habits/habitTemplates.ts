export interface HabitTemplate {
  id: string;
  name: string;
  ritual: 'morning' | 'evening';
  ownerFoundationId: string;
  minimumVersion: string;
}

export const V1_HABIT_TEMPLATES: readonly HabitTemplate[] = [
  { id: 'water-on-waking', name: 'Water on waking', ritual: 'morning', ownerFoundationId: 'body', minimumVersion: 'Drink some water after getting up.' },
  { id: 'morning-daylight', name: 'Morning daylight', ritual: 'morning', ownerFoundationId: 'body', minimumVersion: 'Get outside or into natural daylight after waking.' },
  { id: 'medication-supplements', name: 'Take my medication / supplements', ritual: 'morning', ownerFoundationId: 'body', minimumVersion: 'Take the regimen you have already chosen or been advised to take.' },
  { id: 'daily-movement', name: 'Daily movement minimum', ritual: 'morning', ownerFoundationId: 'body', minimumVersion: 'Do the smallest useful amount of movement today.' },
  { id: 'meditation-settling', name: '5-minute meditation', ritual: 'morning', ownerFoundationId: 'regulate', minimumVersion: 'Sit, breathe, or settle for five minutes.' },
  { id: 'phone-free-first-15', name: 'First 15 minutes phone-free', ritual: 'morning', ownerFoundationId: 'attention', minimumVersion: 'Keep the phone away for the first 15 minutes after waking.' },
  { id: 'morning-spf', name: 'Morning SPF', ritual: 'morning', ownerFoundationId: 'body', minimumVersion: 'Apply your chosen sun protection to face and exposed neck.' },
  { id: 'evening-oral-care', name: 'Evening oral care', ritual: 'evening', ownerFoundationId: 'body', minimumVersion: 'Complete your chosen evening brushing or interdental routine.' },
  { id: 'wind-down', name: 'Wind-down before sleep', ritual: 'evening', ownerFoundationId: 'body', minimumVersion: 'Begin your chosen wind-down and reduce screen use before bed.' },
];
