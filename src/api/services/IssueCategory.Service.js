import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/issue-category';

async function handleRequest(request, ...args) {
  try {
    const result = await request(...args);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export async function getIssueCategories(query = {}) {
  return handleRequest(getRequest, MODEL_NAME, query);
}

export function useGetIssueCategories(query = {}) {
  return useQuery({
    queryKey: ['issueCategories', query],
    queryFn: () => getIssueCategories(query),
    staleTime: 5 * 60 * 1000,
  });
}
