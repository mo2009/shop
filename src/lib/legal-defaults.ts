export const DEFAULT_LEGAL = {
  privacy: `# Privacy Policy

We respect your privacy. This page explains what personal data we collect, why we collect it, and how we keep it safe.

## What we collect
- Account information you provide when you sign up (name, email).
- Order details (shipping address, phone number, payment reference).
- Browsing and cart activity needed to operate the shop.

## How we use it
- To process and deliver your orders.
- To communicate about your order status.
- To improve our products and shopping experience.

## Sharing
We do not sell your personal data. We share information with logistics partners and payment processors strictly to fulfil your order.

## Your rights
You can request access, correction, or deletion of your personal data at any time by contacting us.

(Edit this page from Admin → Settings → Legal.)`,

  terms: `# Terms of Service

By using our website, you agree to these terms.

## Orders
All orders are subject to availability. Prices are listed in EGP and may change without notice. We reserve the right to refuse or cancel any order.

## Payment
Payment is required at the time of order, except for Cash on Delivery orders, which are paid upon receipt.

## Delivery
We aim to deliver within the timelines stated at checkout, but external factors may cause delays.

## Liability
We are not liable for indirect or consequential damages arising from the use of our products beyond the value of your order.

(Edit this page from Admin → Settings → Legal.)`,

  returns: `# Returns & Refunds

We want you to be happy with your purchase.

## Return window
You have 14 days from receipt to request a return for any unused product in its original condition.

## How to return
Contact our team with your order reference and we'll arrange pickup or drop-off instructions.

## Refunds
Once we receive and inspect the returned item, we refund within 7 business days to your original payment method (or as store credit for Cash on Delivery orders).

## Exclusions
Personalized or custom-made items cannot be returned unless defective.

(Edit this page from Admin → Settings → Legal.)`,

  faq: `# Frequently Asked Questions

## How long does shipping take?
Most orders arrive within 2–4 business days inside Egypt.

## Do you ship outside Egypt?
Not yet — we're working on it!

## How do I track my order?
Sign in to your account → My Orders → click an order to see its live status timeline.

## What payment methods do you accept?
Cash on Delivery and Instapay.

## Can I edit my order after placing it?
Get in touch as soon as possible — we can usually update items or address until the order is processed.

(Edit this page from Admin → Settings → Legal.)`,
};

export type LegalKey = keyof typeof DEFAULT_LEGAL;
