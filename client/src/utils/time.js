export function convertTo12Hour(time24) {
  const [hh, mm] = time24.split(':')
  let h = Number(hh)
  let period = 'AM'

  if (h >= 12) {
    period = 'PM'
    if (h > 12) h -= 12
  }
  if (h === 0) h = 12

  return `${h}:${mm} ${period}`
}

export function getTimePeriod(time24) {
  const h = Number(time24.split(':')[0])
  if (h >= 5 && h < 12) return 'Morning'
  if (h >= 12 && h < 17) return 'Afternoon'
  if (h >= 17 && h < 21) return 'Evening'
  return 'Night'
}
