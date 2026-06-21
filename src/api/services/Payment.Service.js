import { useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/payment';

// Hook to create checkout
export function useCreateCheckout() {
    return useMutation({
        mutationFn: async (body) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/checkout`, body);
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
export function useCreateCheckoutWithoutShopperUrl() {
    return useMutation({
        mutationFn: async (body) => {
            try {
                console.log('Mobile app: paymentMethod passed to /app/checkout:', body.paymentMethod);
                const result = await postRequest(`${MODEL_NAME}/app/checkout`, body);
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

export function useCreateSupportCardCheckout() {
    return useMutation({
        mutationFn: async (body) => {
            try {
                console.log('🔵 [Support Card Checkout] Request payload:', JSON.stringify(body, null, 2));
                const result = await postRequest(`${MODEL_NAME}/app/support-card/checkout`, body);

                console.log('🔵 [Support Card Checkout] Response status:', result.status);
                console.log('🔵 [Support Card Checkout] Response data:', JSON.stringify(result.data, null, 2));

                if (result.status === HttpStatusCode.Ok) {
                    const checkoutData = result.data.data;
                    console.log('🔵 [Support Card Checkout] Checkout ID:', checkoutData?.id);
                    return checkoutData;
                } else {
                    console.error('🔴 [Support Card Checkout] Unexpected status:', result.status);
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                console.error('🔴 [Support Card Checkout] Error:', err.message);
                console.error('🔴 [Support Card Checkout] Error response:', JSON.stringify(err.response?.data, null, 2));
                throwServerError(err);
            }
        },
    });
}

export async function checkSupportCardStatus(payload) {
    try {
        console.log('🟢 [Support Card Status] Request payload:', JSON.stringify(payload, null, 2));

        if (!payload.checkoutId || !payload.supportCardId) {
            throw new Error('Checkout ID and Support Card ID are required for status check');
        }

        const result = await postRequest(`${MODEL_NAME}/app/support-card/check-status`, payload);

        console.log('🟢 [Support Card Status] Response status:', result.status);
        console.log('🟢 [Support Card Status] Response data:', JSON.stringify(result.data, null, 2));

        if (result.status === HttpStatusCode.Ok) {
            console.log('🟢 [Support Card Status] Success!');
            return {
                success: true,
                data: result.data.data,
                message: result.data.message,
            };
        } else {
            console.error('🔴 [Support Card Status] Unexpected status:', result.status);
            return {
                success: false,
                message: result.data?.message || ErrorMessages.generalMessage,
                data: null,
            };
        }
    } catch (err) {
        console.error('🔴 [Support Card Status] Error:', err.message);
        console.error('🔴 [Support Card Status] Error response:', JSON.stringify(err.response?.data, null, 2));
        return {
            success: false,
            message: err.response?.data?.message || err.message || 'Support card status check failed',
            data: null,
            error: err,
        };
    }
}



// In Payment.Service.js
export async function CheckPaymentStatus(payload) {
    try {
        if (!payload.checkoutId) {
            throw new Error('Checkout ID is required for payment status check');
        }
        const statusPayload = {
            id: payload.checkoutId,
            appointmentId: payload.appointmentId,
            discountId: payload.discountId || '',
            supportCardId: payload.supportCardId || '',
        };

        const result = await postRequest(`${MODEL_NAME}/status`, statusPayload);

        if (result.status === HttpStatusCode.Ok) {
            const data = result.data.data;
            // Handle different payment statuses
            switch (data.paymentStatus) {
                case 'Success':
                    return {
                        success: true,
                        data: data,
                        message: result.data.message,
                        status: 'completed',
                    };
                case 'AlreadyPaid':
                    return {
                        success: true,
                        data: data,
                        message: 'Payment already completed',
                        status: 'already_paid',
                        skipTransaction: true,
                    };
                case 'ExpiredCheckout':
                    return {
                        success: false,
                        message: data.description,
                        status: 'expired_checkout',
                        requiresNewCheckout: true,
                    };
                default:
                    return {
                        success: true,
                        data: data,
                        message: result.data.message,
                        status: 'unknown',
                    };
            }
        } else {
            return {
                success: false,
                message: result.data?.message || ErrorMessages.generalMessage,
                data: null,
            };
        }
    } catch (err) {
        console.error('[Payment Service] Error checking payment status:', err);

        // 🔥 FIXED: Handle HTTP 400 responses from backend with payment failure details
        // Backend returns 400 when payment fails, but includes useful error details
        if (err.response?.status === 400) {
            const backendError = err.response?.data;

            console.log('🔍 [Payment Service] Backend error structure:', JSON.stringify(backendError, null, 2));

            // 🔥 FIXED: Extract the actual error message from HyperPay result
            // Backend sends the entire HyperPay result object in 'description' field
            let errorMessage = 'Payment verification failed';

            // The backend returns: { paymentStatus: "Failed", description: <full HyperPay result>, code: "100.100.101" }
            // We need to extract the human-readable message from the HyperPay result

            if (backendError?.description && typeof backendError.description === 'object') {
                // Description is the full HyperPay result object
                const hyperPayResult = backendError.description;

                if (hyperPayResult?.result?.description) {
                    // Extract the actual error description from HyperPay
                    errorMessage = hyperPayResult.result.description;
                    if (hyperPayResult.result.parameterErrors) {
                        errorMessage += ": ";
                        errorMessage += hyperPayResult.result.parameterErrors.map(e => `${e.name} - ${e.message}`).join(", ");
                    }
                } else if (hyperPayResult?.description) { // Added this condition
                    errorMessage = hyperPayResult.description;
                } else if (typeof hyperPayResult === 'string') {
                    errorMessage = hyperPayResult;
                }
            } else if (typeof backendError?.description === 'string') {
                // Direct string description
                errorMessage = backendError.description;
            } else if (backendError?.message) {
                // Message field
                errorMessage = backendError.message;
            }

            // Ensure we have a user-friendly message without technical error codes
            if (!errorMessage || errorMessage === 'Payment verification failed') {
                errorMessage = 'Payment verification failed. Please try again.';
            }

            console.log('🔍 [Payment Service] Extracted error message:', errorMessage);

            return {
                success: false,
                message: errorMessage,
                data: backendError?.data || backendError?.description || null,
                paymentStatus: backendError?.paymentStatus || 'Failed',
                error: err,
            };
        }

        // Handle other errors (network, timeout, etc.)
        return {
            success: false,
            message: err.message || 'Payment status check failed',
            data: null,
            error: err,
        };
    }
}


export default {
    useCreateCheckout,
    useCreateCheckoutWithoutShopperUrl,
    useCreateSupportCardCheckout,
    CheckPaymentStatus,
    checkSupportCardStatus,
};
