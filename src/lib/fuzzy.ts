function isAlphaNumeric(value: string): boolean {
  return /[a-z0-9]/i.test(value);
}

function isWordBoundary(target: string, index: number): boolean {
  if (index === 0) return true;
  return !isAlphaNumeric(target[index - 1]);
}

export function fuzzyScore(query: string, target: string): number | null {
  const trimmedQuery = query.trim().toLowerCase();
  const trimmedTarget = target.trim().toLowerCase();

  if (!trimmedQuery) return 0;
  if (!trimmedTarget) return null;

  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;

  for (let i = 0; i < trimmedTarget.length && queryIndex < trimmedQuery.length; i += 1) {
    if (trimmedTarget[i] !== trimmedQuery[queryIndex]) {
      continue;
    }

    let bonus = 1;

    if (i === lastMatchIndex + 1) {
      consecutiveMatches += 1;
      bonus += 2 + Math.min(consecutiveMatches, 3);
    } else {
      consecutiveMatches = 0;
    }

    if (isWordBoundary(trimmedTarget, i)) {
      bonus += 2;
    }

    score += bonus;
    lastMatchIndex = i;
    queryIndex += 1;
  }

  return queryIndex === trimmedQuery.length ? score : null;
}
