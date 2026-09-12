'use client';

import dynamic from 'next/dynamic';

// Dynamically import the map component with SSR disabled
const FieldMap = dynamic(() => import('./FieldMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '16px' }}>
      <p style={{ color: '#666', fontFamily: 'var(--font-sans)' }}>Loading Interactive Map...</p>
    </div>
  ),
});

export default FieldMap;
