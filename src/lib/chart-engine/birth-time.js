export function toDecimalHour(birthTime) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime || '')) {
    throw new RangeError('Birth time must use HH:MM; seconds are not supported');
  }
  const [hours, minutes] = birthTime.split(':').map(Number);
  return hours + minutes / 60;
}
