'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login with a message
    router.push('/auth/login?signup_disabled=true');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Account Creation</h1>
        <p className="text-gray-600">
          Accounts are created by administrators through the hierarchy system.
          <br />
          Please contact your administrator to create an account.
        </p>
      </div>
    </div>
  );
}
