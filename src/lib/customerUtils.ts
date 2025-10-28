export interface Customer {
  id?: string;
  databaseId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

// Helper function to safely get customer ID
export const getCustomerId = (customer: Customer | null | undefined): string | null => {
  if (!customer) return null;
  return customer.id || customer.databaseId || null;
}

export const getCustomerEmail = (customer: Customer | null | undefined): string | null => {
  if (!customer) return null;
  return customer.email || null;
}