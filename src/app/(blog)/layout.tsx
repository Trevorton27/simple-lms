import { LocaleProvider } from '@/contexts/LocaleContext';
import { ReactNode } from 'react';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
