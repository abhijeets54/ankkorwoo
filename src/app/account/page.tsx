'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/components/providers/CustomerProvider';
import AccountDashboard from '@/components/account/AccountDashboard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCustomer();
  const [customerData, setCustomerData] = useState<any>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [orderLimit, setOrderLimit] = useState(10);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in?redirect=/account');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch customer data with orders from API
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomerData();
    }
  }, [isAuthenticated]);

  const fetchCustomerData = async () => {
    setIsLoadingOrders(true);
    setError(null);

    try {
      const response = await fetch(`/api/customer-with-orders?limit=${orderLimit}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }

      const data = await response.json();

      if (data.success && data.customer) {
        setCustomerData(data.customer);
        setHasMoreOrders(data.customer.orders?.pageInfo?.hasNextPage || false);
      } else {
        throw new Error(data.message || 'Failed to load customer data');
      }
    } catch (err: any) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Failed to load account data');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Show loading while checking authentication or fetching data
  if (authLoading || isLoadingOrders) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-serif mb-8">My Account</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading account information...</span>
        </div>
      </div>
    );
  }

  // Show error if failed to load
  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-serif mb-8">My Account</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
          <button
            onClick={fetchCustomerData}
            className="ml-4 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render dashboard with customer data
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-serif mb-8">My Account</h1>

              {customerData ? (
        <>
          <AccountDashboard customerData={customerData} onRefresh={fetchCustomerData} />
          {hasMoreOrders && !isLoadingOrders && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setOrderLimit(prev => prev + 10);
                  fetchCustomerData();
                }}
              >
                Load More Orders
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Unable to load account information. Please try again later.
        </div>
      )}
    </div>
  );
}
