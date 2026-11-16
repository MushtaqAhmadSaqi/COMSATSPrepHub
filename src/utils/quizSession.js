export function scoreAnswers(userAnswers) {
  return Object.values(userAnswers || {}).filter((answer) => answer?.isCorrect).length;
}

export function canSubmitAnswer(userAnswers, questionIndex, selectedOption) {
  return selectedOption !== null && !userAnswers?.[questionIndex];
}

export function getAnswerState(userAnswers, questionIndex) {
  const answer = userAnswers?.[questionIndex];
  if (!answer) {
    return { selectedOption: null, revealed: false };
  }

  return { selectedOption: answer.selected, revealed: true };
}
