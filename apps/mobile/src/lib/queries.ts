import type { Customer, PaymentMethod, ReportEntry, Summary, Transaction, TransactionType } from '@baki/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  summary: ['owner', 'summary'] as const,
  customers: (q: string) => ['owner', 'customers', q] as const,
  customer: (id: number) => ['owner', 'customer', id] as const,
  transactions: (id: number) => ['owner', 'customer', id, 'transactions'] as const,
  me: ['customer', 'me'] as const,
  myTransactions: ['customer', 'transactions'] as const,
  report: (from: string) => ['owner', 'report', from] as const,
};

/** Every entry in the shop for one local day [from, to). */
export const useReport = (from: Date, to: Date) =>
  useQuery({
    queryKey: keys.report(from.toISOString()),
    queryFn: () =>
      api<{ entries: ReportEntry[] }>(
        `/owner/report?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      ).then((r) => r.entries),
  });

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: () => api<Summary>('/owner/summary') });

export const useCustomers = (q: string) =>
  useQuery({
    queryKey: keys.customers(q),
    queryFn: () =>
      api<{ customers: Customer[] }>(`/owner/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.customers),
    placeholderData: (previous) => previous,
  });

export const useCustomer = (id: number) =>
  useQuery({
    queryKey: keys.customer(id),
    queryFn: () => api<{ customer: Customer }>(`/owner/customers/${id}`).then((r) => r.customer),
  });

export const useCustomerTransactions = (id: number) =>
  useQuery({
    queryKey: keys.transactions(id),
    queryFn: () => api<{ transactions: Transaction[] }>(`/owner/customers/${id}/transactions`).then((r) => r.transactions),
  });

/** After any change to a customer, refresh the lists and totals that show them. */
export function useRefreshCustomer() {
  const queryClient = useQueryClient();
  return (customer: Customer) => {
    queryClient.setQueryData(keys.customer(customer.id), customer);
    void queryClient.invalidateQueries({ queryKey: ['owner', 'customers'] });
    void queryClient.invalidateQueries({ queryKey: keys.summary });
  };
}

export function useAddEntry(customerId: number) {
  const queryClient = useQueryClient();
  const refresh = useRefreshCustomer();
  return useMutation({
    mutationFn: (input: { type: TransactionType; amount: number; note?: string; method?: PaymentMethod; promisedOn?: string | null }) =>
      api<{ transaction: Transaction; customer: Customer }>(`/owner/customers/${customerId}/transactions`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: ({ customer }) => {
      refresh(customer);
      void queryClient.invalidateQueries({ queryKey: keys.transactions(customerId) });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'report'] });
    },
  });
}

/** The API lets the owner delete an entry for 24 hours after it was recorded. */
export function withinUndoWindow(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

/** Deletes the customer's latest entry (the API allows only that one, within 24 hours). */
export function useUndoEntry(customerId: number) {
  const queryClient = useQueryClient();
  const refresh = useRefreshCustomer();
  return useMutation({
    mutationFn: (transactionId: number) =>
      api<{ customer: Customer }>(`/owner/customers/${customerId}/transactions/${transactionId}`, { method: 'DELETE' }),
    onSuccess: ({ customer }) => {
      refresh(customer);
      void queryClient.invalidateQueries({ queryKey: keys.transactions(customerId) });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'report'] });
    },
  });
}
