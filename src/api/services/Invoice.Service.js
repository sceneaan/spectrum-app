import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

/**
 * Get invoice for a transaction by slug
 * @param {string} transactionSlug - The transaction slug
 * @returns {Promise} Invoice data with QR code
 */
export async function GetInvoice(transactionSlug) {
    try {
        // Use the correct backend route: /invoice/slug/:slug/invoice
        const result = await getRequest(`/invoice/slug/${transactionSlug}/invoice`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data?.invoice || result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

/**
 * Generate invoice for a transaction
 * @param {string} transactionId - The transaction ID
 * @returns {Promise} Generated invoice data with QR code
 */
export async function GenerateInvoice(transactionId) {
    try {
        // Use the correct backend route: /transaction/:transactionId/generate-invoice
        const result = await postRequest(`/transaction/${transactionId}/generate-invoice`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

/**
 * Send invoice to patient email
 * @param {string} transactionSlug - The transaction slug
 * @returns {Promise} Success message
 */
export async function SendInvoice(transactionSlug) {
    try {
        const result = await postRequest(`${MODEL_NAME}/${transactionSlug}/send-invoice`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.message;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

