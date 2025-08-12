'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, User, Edit } from 'lucide-react';
import { useCustomer } from '@/components/providers/CustomerProvider';
// Face ID management removed

interface CustomerData {
  id: string;
  databaseId: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username?: string;
  role?: string;
  date?: string;
  modified?: string;
  isPayingCustomer?: boolean;
  orderCount?: number;
  totalSpent?: number;
  billing?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  orders?: {
    nodes: Array<{
      id: string;
      databaseId: number;
      date: string;
      status: string;
      total: string;
      subtotal?: string;
      totalTax?: string;
      shippingTotal?: string;
      discountTotal?: string;
      paymentMethodTitle?: string;
      customerNote?: string;
      billing?: {
        firstName: string;
        lastName: string;
        company: string;
        address1: string;
        address2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
        email: string;
        phone: string;
      };
      shipping?: {
        firstName: string;
        lastName: string;
        company: string;
        address1: string;
        address2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
      };
      lineItems: {
        nodes: Array<{
          product: {
            node: {
              id: string;
              name: string;
              slug?: string;
              image?: {
                sourceUrl: string;
                altText: string;
              };
            };
          };
          variation?: {
            node: {
              id: string;
              name: string;
              attributes?: {
                nodes: Array<{
                  name: string;
                  value: string;
                }>;
              };
            };
          };
          quantity: number;
          total: string;
          subtotal?: string;
          totalTax?: string;
        }>;
      };
      shippingLines?: {
        nodes: Array<{
          methodTitle: string;
          total: string;
        }>;
      };
      feeLines?: {
        nodes: Array<{
          name: string;
          total: string;
        }>;
      };
      couponLines?: {
        nodes: Array<{
          code: string;
          discount: string;
        }>;
      };
    }>;
  };
  downloadableItems?: {
    nodes: Array<{
      name: string;
      downloadId: string;
      downloadsRemaining?: number;
      accessExpires?: string;
      product: {
        node: {
          id: string;
          name: string;
        };
      };
    }>;
  };
  metaData?: Array<{
    key: string;
    value: string;
  }>;
}

interface AccountDashboardProps {
  // Remove customer prop since we'll get it from context
}

const AccountDashboard: React.FC<AccountDashboardProps> = () => {
  const router = useRouter();
  const { customer, updateProfile, refreshCustomer } = useCustomer();

  // Return loading state if customer is not available
  if (!customer) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-[#8a8778]">Loading account information...</div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState('profile');
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Profile edit form state
  const [profileForm, setProfileForm] = useState({
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email || '',
    phone: customer.billing?.phone || ''
  });

  // Update form state when customer data changes
  useEffect(() => {
    setProfileForm({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.billing?.phone || ''
    });
  }, [customer]);
  
  // Handle profile form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const profileData: any = {
        id: customer.id, // Include customer ID for WooCommerce update
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        billing: {
          ...customer.billing,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone
        }
      };

      // Use CustomerProvider's updateProfile method
      await updateProfile(profileData);
      setEditProfileMode(false);
      setFormSuccess('Profile updated successfully');

      // Clear success message after a delay
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setFormError(err.message || 'An error occurred while updating your profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-[#8a8778] mb-8">
        Welcome back, {customer.firstName} {customer.lastName}
      </p>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid ${customer.downloadableItems && customer.downloadableItems.nodes.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} mb-8`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          {customer.downloadableItems && customer.downloadableItems.nodes.length > 0 && (
            <TabsTrigger value="downloads" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Downloads</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {formError}
                </div>
              )}
              
              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  {formSuccess}
                </div>
              )}
              
              {editProfileMode ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-[#5c5c52] mb-1">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        className="w-full border-[#e5e2d9] focus:border-[#8a8778] focus:ring-[#8a8778]"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-[#5c5c52] mb-1">
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        className="w-full border-[#e5e2d9] focus:border-[#8a8778] focus:ring-[#8a8778]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#5c5c52] mb-1">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full border-[#e5e2d9] focus:border-[#8a8778] focus:ring-[#8a8778] bg-[#f4f3f0]"
                      disabled
                    />
                    <p className="mt-1 text-xs text-[#8a8778]">
                      Email cannot be changed. Please contact support if you need to change your email.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[#5c5c52] mb-1">
                      Phone
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="w-full border-[#e5e2d9] focus:border-[#8a8778] focus:ring-[#8a8778]"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#2c2c27]"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditProfileMode(false);
                        // Reset form to original values
                        setProfileForm({
                          firstName: customer.firstName || '',
                          lastName: customer.lastName || '',
                          email: customer.email || '',
                          phone: customer.billing?.phone || ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#5c5c52]">First Name</h3>
                      <p className="text-[#2c2c27]">{customer.firstName || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#5c5c52]">Last Name</h3>
                      <p className="text-[#2c2c27]">{customer.lastName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#5c5c52]">Email</h3>
                      <p className="text-[#2c2c27]">{customer.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#5c5c52]">Phone</h3>
                      <p className="text-[#2c2c27]">{customer.billing?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              {!editProfileMode && (
                <Button
                  variant="outline"
                  onClick={() => setEditProfileMode(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                View and track your orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.orders && customer.orders.nodes.length > 0 ? (
                <div className="space-y-6">
                  {customer.orders.nodes.map((order) => (
                    <div key={order.id} className="border border-[#e5e2d9] p-6 rounded-md">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-[#2c2c27]">Order #{order.databaseId}</h3>
                          <p className="text-sm text-[#8a8778]">
                            Placed on {new Date(order.date).toLocaleDateString()}
                          </p>
                          {order.paymentMethodTitle && (
                            <p className="text-xs text-[#8a8778]">
                              Payment: {order.paymentMethodTitle}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-[#2c2c27]">${parseFloat(order.total || '0').toFixed(2)}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-3 mb-4">
                        <h4 className="text-sm font-medium text-[#5c5c52]">Items</h4>
                        {order.lineItems.nodes.map((item, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                            {item.product.node.image && (
                              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={item.product.node.image.sourceUrl}
                                  alt={item.product.node.image.altText || item.product.node.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-[#2c2c27] font-medium">{item.product.node.name}</p>
                              {item.variation && item.variation.node.attributes && (
                                <div className="text-xs text-[#8a8778]">
                                  {item.variation.node.attributes.nodes.map((attr, attrIndex) => (
                                    <span key={attrIndex}>
                                      {attr.name}: {attr.value}
                                      {attrIndex < item.variation!.node.attributes!.nodes.length - 1 && ', '}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-[#8a8778]">
                                Qty: {item.quantity} × ${(parseFloat(item.total || '0') / item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-[#2c2c27]">
                                ${parseFloat(item.total || '0').toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Summary */}
                      <div className="border-t border-[#e5e2d9] pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-[#8a8778]">Subtotal:</span>
                            <p className="font-medium">${parseFloat(order.subtotal || '0').toFixed(2)}</p>
                          </div>
                          {order.shippingTotal && parseFloat(order.shippingTotal) > 0 && (
                            <div>
                              <span className="text-[#8a8778]">Shipping:</span>
                              <p className="font-medium">${parseFloat(order.shippingTotal).toFixed(2)}</p>
                            </div>
                          )}
                          {order.totalTax && parseFloat(order.totalTax) > 0 && (
                            <div>
                              <span className="text-[#8a8778]">Tax:</span>
                              <p className="font-medium">${parseFloat(order.totalTax).toFixed(2)}</p>
                            </div>
                          )}
                          {order.discountTotal && parseFloat(order.discountTotal) > 0 && (
                            <div>
                              <span className="text-[#8a8778]">Discount:</span>
                              <p className="font-medium text-green-600">-${parseFloat(order.discountTotal).toFixed(2)}</p>
                            </div>
                          )}
                        </div>

                        {/* Shipping and Billing Addresses */}
                        {(order.shipping || order.billing) && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.billing && (
                              <div>
                                <h5 className="text-sm font-medium text-[#5c5c52] mb-2">Billing Address</h5>
                                <div className="text-xs text-[#8a8778]">
                                  <p>{order.billing.firstName} {order.billing.lastName}</p>
                                  {order.billing.company && <p>{order.billing.company}</p>}
                                  <p>{order.billing.address1}</p>
                                  {order.billing.address2 && <p>{order.billing.address2}</p>}
                                  <p>{order.billing.city}, {order.billing.state} {order.billing.postcode}</p>
                                  <p>{order.billing.country}</p>
                                  {order.billing.phone && <p>Phone: {order.billing.phone}</p>}
                                </div>
                              </div>
                            )}
                            {order.shipping && order.shipping.address1 && (
                              <div>
                                <h5 className="text-sm font-medium text-[#5c5c52] mb-2">Shipping Address</h5>
                                <div className="text-xs text-[#8a8778]">
                                  <p>{order.shipping.firstName} {order.shipping.lastName}</p>
                                  {order.shipping.company && <p>{order.shipping.company}</p>}
                                  <p>{order.shipping.address1}</p>
                                  {order.shipping.address2 && <p>{order.shipping.address2}</p>}
                                  <p>{order.shipping.city}, {order.shipping.state} {order.shipping.postcode}</p>
                                  <p>{order.shipping.country}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Customer Note */}
                        {order.customerNote && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-[#5c5c52] mb-2">Order Notes</h5>
                            <p className="text-xs text-[#8a8778] bg-gray-50 p-2 rounded">{order.customerNote}</p>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm">View Full Details</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#8a8778] mb-4">You haven't placed any orders yet.</p>
                  <Button onClick={() => router.push('/collection')}>
                    Start Shopping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Downloads Tab */}
        {customer.downloadableItems && customer.downloadableItems.nodes.length > 0 && (
          <TabsContent value="downloads">
            <Card>
              <CardHeader>
                <CardTitle>Downloadable Items</CardTitle>
                <CardDescription>
                  Access your digital downloads and products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.downloadableItems.nodes.map((item, index) => (
                    <div key={index} className="border border-[#e5e2d9] p-4 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-[#2c2c27]">{item.name}</h3>
                          <p className="text-sm text-[#8a8778] mb-2">
                            Product: {item.product.node.name}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <label className="text-xs text-[#8a8778]">Download ID</label>
                              <p className="text-[#2c2c27]">{item.downloadId}</p>
                            </div>

                            <div>
                              <label className="text-xs text-[#8a8778]">Downloads Remaining</label>
                              <p className="text-[#2c2c27]">
                                {item.downloadsRemaining !== null ? item.downloadsRemaining : 'Unlimited'}
                              </p>
                            </div>

                            <div>
                              <label className="text-xs text-[#8a8778]">Access Expires</label>
                              <p className="text-[#2c2c27]">
                                {item.accessExpires
                                  ? new Date(item.accessExpires).toLocaleDateString()
                                  : 'Never'
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={item.downloadsRemaining === 0}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Face ID tab removed */}
      </Tabs>
    </motion.div>
  );
};

export default AccountDashboard; 