import * as Lucide from 'lucide-react';

const iconsToCheck = ['ChevronRight', 'PlaneOff', 'CalendarX', 'Calendar'];

console.log('Checking icons...');
iconsToCheck.forEach(icon => {
    console.log(`${icon}: ${!!Lucide[icon]}`);
});
