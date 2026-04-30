import type { Metadata } from 'next';
import LegalRenderer from '../LegalRenderer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply when you use our website and services.',
};

export default function TermsPage() {
  return <LegalRenderer kind="terms" />;
}
