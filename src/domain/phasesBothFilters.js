// The filters of Informes › Dedicació that projects/phases-both applies on the
// server (issues/309): the calendar year of the hours, the person and the
// project. 0 / empty means all, as in the report.
const positive = (value) => {
  const n = parseInt(value, 10)
  return n > 0 ? n : null
}

export function phasesBothFilters ({ year, person, project } = {}) {
  const params = [
    ['year', positive(year)],
    ['user', positive(person)],
    ['project', positive(project)]
  ]
  return params
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `&${name}=${value}`)
    .join('')
}
