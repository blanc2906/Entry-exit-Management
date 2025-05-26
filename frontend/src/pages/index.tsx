import React from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  
  React.useEffect(() => {
    router.push('/users');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to dashboard...</p>
    </div>
  );
}