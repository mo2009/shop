import { Coupon } from './types';

export interface CouponValidationResult {
  ok: boolean;
  reason?: string;
  discount: number;
}

/** Validate a coupon against a subtotal, returning the discount amount in EGP. */
export function validateCoupon(coupon: Coupon | null, subtotal: number): CouponValidationResult {
  if (!coupon) return { ok: false, reason: 'Coupon not found', discount: 0 };
  if (!coupon.active) return { ok: false, reason: 'This coupon is no longer active', discount: 0 };
  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) {
      return { ok: false, reason: 'This coupon has expired', discount: 0 };
    }
  }
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
    return { ok: false, reason: 'This coupon has reached its usage limit', discount: 0 };
  }
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return {
      ok: false,
      reason: `Minimum order of ${coupon.minOrder} EGP required`,
      discount: 0,
    };
  }
  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = coupon.value;
  }
  discount = Math.min(discount, subtotal);
  return { ok: true, discount };
}
