import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/document';

// Add a document by a patient
export async function AddDocumentByPatient(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/add/by/patient`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

// Add a document by a provider
export async function AddDocumentByProvider(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/add/by/provider`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

// Get all documents for a patient
export async function GetAllDocuments(id) {
  try {
    const result = await getRequest(`${MODEL_NAME}/${id}`);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

// Get all documents from a provider
export async function GetAllDocumentsFromProvider(id) {
  try {
    const result = await getRequest(`${MODEL_NAME}/my/${id}/from/provider`);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}
