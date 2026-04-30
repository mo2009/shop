import type { Metadata } from 'next';
import LegalRenderer from '../LegalRenderer';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to the most common questions about ordering, shipping and returns.',
};

export default function FaqPage() {
  return <LegalRenderer kind="faq" />;
}
