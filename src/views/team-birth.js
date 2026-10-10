/** Calculation-only copy: unknown time remains explicitly estimated. */
export function effectiveTeamBirth(birth) {
  return { ...birth, birthTime: birth.timeUnknown === true ? '12:00' : birth.birthTime };
}
