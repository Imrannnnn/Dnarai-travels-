export function to12Hour(time24) {
  const [hh, mm] = String(time24).split(':');
  let h = Number(hh);
  let period = 'AM';

  if (h >= 12) {
    period = 'PM';
    if (h > 12) h -= 12;
  }
  if (h === 0) h = 12;

  return `${h}:${mm} ${period}`;
}

export function timePeriod(time24) {
  const h = Number(String(time24).split(':')[0]);
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}
