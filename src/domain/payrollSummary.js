// Persones › «Crear bestretes»: why a person's year has no 12 advances.
// `info` is a row of payrolls/create-all: { created, existing, skipped }, where
// skipped is [{ month, reason }] for the months left without one.

const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol",
  "agost", "setembre", "octubre", "novembre", "desembre"];

const REASONS = {
  "no-period": "cap període de jornada l'últim dia del mes",
  "zero-hours": "jornada de 0 h (sense jornada activa)",
  "no-calendar": "el mes o l'any no està creat a la configuració",
};

// consecutive months with the same reason: «gener–març»
function groups(skipped) {
  const out = [];
  [...skipped].sort((a, b) => a.month - b.month).forEach(s => {
    const last = out[out.length - 1];
    if (last && last.reason === s.reason && last.to === s.month - 1) {
      last.to = s.month;
    } else {
      out.push({ reason: s.reason, from: s.month, to: s.month });
    }
  });
  return out;
}

function monthRange(g) {
  const from = MONTHS[g.from - 1] || g.from;
  return g.from === g.to ? from : `${from}–${MONTHS[g.to - 1] || g.to}`;
}

export function payrollTotal(info) {
  return (info.created || 0) + (info.existing || 0);
}

// "" when the year has its 12 advances
export function missingPayrollsText(info) {
  const total = payrollTotal(info);
  if (total === 12) {
    return "";
  }
  if (total > 12) {
    return `Té ${total} bestretes per a 12 mesos: n'hi ha de repetides, revisa-les a Bestretes.`;
  }
  const head = `Té ${total} de 12 bestretes.`;
  const skipped = info.skipped || [];
  if (!skipped.length) {
    return `${head} Només es creen els mesos amb una jornada de més de 0 h l'últim dia del mes.`;
  }
  const lines = groups(skipped).map(g => `${monthRange(g)}: ${REASONS[g.reason] || g.reason}`);
  return `${head} Sense bestreta: ${lines.join("; ")}.`;
}
