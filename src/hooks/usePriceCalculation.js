import { useMemo } from 'react';
import { TAX_RATES } from '../constants/payment';
import { isSaudiUser } from '../utils/generic';

/**
 * Calculate final price with tax, discounts, and support card
 *
 * Calculation order (compliant with Saudi VAT law):
 * 1. Start with base price (subtotal)
 * 2. Apply discount to subtotal
 * 3. Calculate tax on DISCOUNTED amount (compliant with ZATCA regulations)
 * 4. Add tax to discounted subtotal
 * 5. Apply support card to final amount (subtotal + tax - discount)
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.appointment - Appointment data with provider service and slot price
 * @param {string} params.userNationality - User's nationality
 * @param {Object} params.discountApplied - Discount data (if applied)
 * @param {Object} params.supportCardApplied - Support card data (if applied)
 * @returns {Object} Price calculation breakdown with all amounts
 */
export const usePriceCalculation = ({
  appointment,
  userNationality,
  discountApplied,
  supportCardApplied,
}) => {
  return useMemo(() => {
    const basePrice = appointment?.providerService?.slotPrice || 0;

    // Determine tax rate based on nationality
    const isSaudi = isSaudiUser(userNationality);
    const taxRate = isSaudi ? TAX_RATES.SAUDI_ARABIA : TAX_RATES.INTERNATIONAL;

    // Apply discount to base price
    const discountAmount = discountApplied?.amount || 0;
    const subtotalAfterDiscount = Math.max(0, basePrice - discountAmount);

    // Calculate tax on discounted amount (after discounts)
    const taxAmount = subtotalAfterDiscount * taxRate;

    // Total after discount and tax
    const totalAmount = Number((subtotalAfterDiscount + taxAmount).toFixed(2));

    // Apply support card to total amount
    const supportCardAmount = supportCardApplied?.amount || 0;
    const payableAmount = Number(Math.max(0, totalAmount - supportCardAmount).toFixed(2));

    return {
      basePrice,
      taxRate,
      taxAmount: Number(taxAmount.toFixed(2)),
      discountAmount,
      supportCardAmount,
      totalAmount,
      payableAmount,
    };
  }, [
    appointment?.providerService?.slotPrice,
    userNationality,
    discountApplied?.amount,
    supportCardApplied?.amount,
  ]);
};
