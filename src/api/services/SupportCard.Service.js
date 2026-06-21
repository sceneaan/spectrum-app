import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/supportCard';

// Hook to create a support card
export function useCreateSupportCard() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/app/create`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}

// Hook to list support cards
export function useListSupportCard(query) {
  return useQuery({
    queryKey: ['listSupportCard', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/list`, query);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}

// Hook to update support card status
export function useUpdateSupportCardStatus() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await putRequest(`${MODEL_NAME}/status`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}

// Hook to assign a support card to a user
export function useAssignSupportCardToUser() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await putRequest(`${MODEL_NAME}/assign`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}

// Hook to redeem a support card
export function useRedeemSupportCard() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/redeem`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}


export async function CheckSupportCard(code, body) {
  try {
    const result = await postRequest(`${MODEL_NAME}/check/${code}`, body);

    if (result.status === HttpStatusCode.Ok) { return result.data.data; }
    else { throw new Error(ErrorMessages.generalMessage); }
  } catch (err) {
    return throwServerError(err);
  }
}
