/**
 * Stripe fee calculation utilities for reward payments.
 *
 * Stripe charges 2.9% + $0.30 per transaction.
 * We calculate the total amount to charge so the finder receives the full reward.
 */

// Stripe fee rates
const STRIPE_PERCENTAGE_FEE = 0.029; // 2.9%
const STRIPE_FLAT_FEE_CENTS = 30; // $0.30

/**
 * Calculate the Stripe processing fee for a given reward amount.
 * This calculates the fee such that after Stripe takes their cut,
 * the finder receives exactly the reward amount.
 *
 * @param rewardAmount - The reward amount in dollars
 * @returns The fee amount in dollars
 */
export function calculateStripeFee(rewardAmount: number): number {
  if (rewardAmount <= 0) return 0;

  const rewardCents = Math.round(rewardAmount * 100);

  // To ensure finder gets exact reward, calculate what to charge:
  // total = (reward + flat_fee) / (1 - percentage_fee)
  const totalCents = Math.ceil((rewardCents + STRIPE_FLAT_FEE_CENTS) / (1 - STRIPE_PERCENTAGE_FEE));
  const feeCents = totalCents - rewardCents;

  return feeCents / 100;
}

/**
 * Calculate the total amount the owner will pay (reward + fee).
 *
 * @param rewardAmount - The reward amount in dollars
 * @returns The total amount in dollars
 */
export function calculateTotalWithFee(rewardAmount: number): number {
  if (rewardAmount <= 0) return 0;
  return rewardAmount + calculateStripeFee(rewardAmount);
}

/**
 * Format a fee preview message for display.
 *
 * @param rewardAmount - The reward amount in dollars
 * @returns A formatted string describing the fee
 */
export function formatFeePreview(rewardAmount: number): string {
  if (rewardAmount <= 0) return '';

  const fee = calculateStripeFee(rewardAmount);
  const total = rewardAmount + fee;

  return `$${total.toFixed(2)} with card (includes $${fee.toFixed(2)} processing fee)`;
}

/**
 * Format a short fee hint for display next to reward input.
 *
 * @param rewardAmount - The reward amount in dollars
 * @returns A short formatted string
 */
export function formatFeeHint(rewardAmount: number): string {
  if (rewardAmount <= 0) return '';

  const fee = calculateStripeFee(rewardAmount);
  const total = rewardAmount + fee;

  return `Card: $${total.toFixed(2)} (+$${fee.toFixed(2)} fee)`;
}
