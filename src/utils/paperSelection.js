export function getPaperKey(paper) {
  return paper?.id || paper?.title || '';
}

export function hasPaperIdentity(paper) {
  return Boolean(getPaperKey(paper));
}
