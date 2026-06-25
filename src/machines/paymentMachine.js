// src/machines/paymentMachine.js
import { useState, useMemo, useCallback } from 'react';

export const usePaymentMachine = ({
  createTransaction,
  createCheckout,
  checkPaymentStatus,
}) => {
  const [context, setContext] = useState({
    state: 'idle',
    appointment: null,
    wallet: null,
    paymentMethod: 'card',
    discount: null,
    supportCard: null,
    priceCalculation: null,
    isLoading: false,
    transactionId: null,
    checkoutId: null,
    totalAmount: 0,
    payableAmount: 0,
  });

  const setState = useCallback((newState) => {
    setContext((prev) => ({ ...prev, ...newState }));
  }, []);

  const actions = useMemo(() => {
    return {
      setAppointment: (appointment) => setState({ appointment }),
      setWallet: (wallet) => setState({ wallet }),
      setPaymentMethod: (paymentMethod) => setState({ paymentMethod }),
      applyDiscount: (discount) => setState({ discount }),
      removeDiscount: () => setState({ discount: null }),
      applySupportCard: (supportCard) => setState({ supportCard }),
      removeSupportCard: () => setState({ supportCard: null }),
      updatePricing: (pricing) =>
        setState({
          priceCalculation: pricing,
          totalAmount: pricing.totalAmount,
          payableAmount: pricing.payableAmount,
        }),
      executePayment: () => {
        setContext(prevContext => {
          if (prevContext.paymentMethod === 'Wallet') {
            if (prevContext.wallet.availableBalance < prevContext.payableAmount) {
              return { ...prevContext, state: 'insufficient_funds', isLoading: false };
            }
            createTransaction(
              {
                appointmentId: prevContext.appointment.id,
                paymentMethod: 'Wallet',
                walletId: prevContext.wallet._id,
                walletAmount: prevContext.payableAmount,
                status: 'Completed',
              },
              {
                onSuccess: (data) => {
                  setState({
                    state: 'success',
                    isLoading: false,
                    transactionId: data.transaction._id,
                  });
                },
                onError: () => {
                  setState({ state: 'error', isLoading: false });
                },
              }
            );
          } else {
            let paymentBrand;
            if (prevContext.paymentMethod === 'Credit Card') {
              paymentBrand = 'visa_mastercard';
            } else if (prevContext.paymentMethod === 'Apple Pay') {
              paymentBrand = 'apple_pay';
            } else {
              paymentBrand = prevContext.paymentMethod;
            }
            console.log('Calling createCheckout with paymentMethod:', paymentBrand);
            createCheckout(
              {
                amount: prevContext.payableAmount,
                paymentMethod: paymentBrand,
                appointmentId: prevContext.appointment.id,
              },
              {
                onSuccess: (data) => {
                  console.log('createCheckout success:', data);
                  setState({ checkoutId: data.id });
                },
                onError: (error) => {
                  console.log('createCheckout error:', error);
                  setState({ state: 'error', isLoading: false });
                },
              }
            );
          }
          
          return { ...prevContext, state: 'processing', isLoading: true };
        });
      },
      handlePaymentCompleted: () => {
        setState({ state: 'processing' });
      },
      verifyPayment: async (checkoutId) => {
        try {
          const statusResult = await checkPaymentStatus({
            checkoutId,
            appointmentId: context.appointment?.id,
          });
          if (statusResult.success) {
            setState({
              state: 'success',
              isLoading: false,
              transactionId: statusResult.data?.transaction?._id,
            });
          } else {
            setState({ state: 'error', isLoading: false });
          }
        } catch (error) {
          setState({ state: 'error', isLoading: false });
        }
      },
      retry: () => {
        setState({ state: 'idle', checkoutId: null, isLoading: false });
      },
    };
  }, [createTransaction, createCheckout, checkPaymentStatus, setState, context.appointment?.id]);

  return { context, actions };
};
