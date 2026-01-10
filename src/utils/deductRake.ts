export function deductRake(amount: number, rake: number) {
  const remainingPercent = (100 - rake) / 100;
  return amount * remainingPercent;
}
