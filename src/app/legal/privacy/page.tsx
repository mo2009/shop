import type { Metadata } from 'next';
import LegalRenderer from '../LegalRenderer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we collect, use and protect your personal data.',
};

export default function PrivacyPage() {
  return <LegalRenderer kind="privacy" />;
}
