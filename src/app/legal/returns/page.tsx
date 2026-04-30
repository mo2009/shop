import type { Metadata } from 'next';
import LegalRenderer from '../LegalRenderer';

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description: 'How to return a product and how refunds work.',
};

export default function ReturnsPage() {
  return <LegalRenderer kind="returns" />;
}
