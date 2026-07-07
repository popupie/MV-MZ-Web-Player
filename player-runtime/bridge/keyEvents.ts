// @ts-nocheck

export function exactModifierMatch(event, trigger) {
  return (
    Boolean(event.altKey) === Boolean(trigger.altKey) &&
    Boolean(event.ctrlKey) === Boolean(trigger.ctrlKey) &&
    Boolean(event.metaKey) === Boolean(trigger.metaKey) &&
    Boolean(event.shiftKey) === Boolean(trigger.shiftKey)
  );
}

export function keyEventMatchesChord(event, chord) {
  return (
    event.code === chord.code &&
    exactModifierMatch(event, chord)
  );
}

export function positiveFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
