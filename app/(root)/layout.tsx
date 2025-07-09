import { ReactNode } from 'react';

import AgoraClientProvider from '@/providers/AgoraClientProvider';

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main>
      <AgoraClientProvider>{children}</AgoraClientProvider>
    </main>
  );
};

export default RootLayout;