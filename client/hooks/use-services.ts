import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ServicePayload {
  serviceType: string;
  amount: number;
  mobile?: string;
  accountNumber?: string;
  ifscCode?: string;
  beneficiaryName?: string;
  operatorCode?: string;
  billerName?: string;
  consumerNumber?: string;
  remarks?: string;
}

export interface ServiceResult {
  transactionId: string;
  status: string;
  amount: number;
  description: string;
  message: string;
}

export const useProcessService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ServicePayload) => {
      const { data } = await api.post('/services/process', payload);
      return data.data as ServiceResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      qc.invalidateQueries({ queryKey: ['services-history'] });
    },
  });
};

export const useServiceHistory = (page = 1) =>
  useQuery({
    queryKey: ['services-history', page],
    queryFn: async () => {
      const { data } = await api.get('/services/history', {
        params: { page, limit: 10 },
      });
      return data;
    },
  });