export interface ClassifiableIssueContent {
  title: string;
  body: string | null;
  labels: readonly string[];
}

function normalizeLabels(
  labels: readonly string[],
): string[] {
  return [...new Set(labels)].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function needsIssueReclassification(
  current: ClassifiableIssueContent,
  incoming: ClassifiableIssueContent,
): boolean {
  if (
    current.title !== incoming.title ||
    current.body !== incoming.body
  ) {
    return true;
  }

  const currentLabels = normalizeLabels(current.labels);
  const incomingLabels = normalizeLabels(incoming.labels);

  return (
    currentLabels.length !== incomingLabels.length ||
    currentLabels.some(
      (label, index) => label !== incomingLabels[index],
    )
  );
}
