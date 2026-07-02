// src/machines/paymentMachine.js
import { useState, useMemo, useCallback } from 'react';

const resolveAppointmentId = (appointment) => appointment?._id || appointment?.id;

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
        setContext((prevContext) => {
          if (prevContext.state === 'processing' || prevContext.isLoading) {
            return prevContext;
          }

          const appointmentId = resolveAppointmentId(prevContext.appointment);

          if (!appointmentId) {
            return { ...prevContext, state: 'error', isLoading: false };
          }

          if (prevContext.paymentMethod === 'Wallet') {
            if (!prevContext.wallet) {
              return { ...prevContext, state: 'error', isLoading: false };
            }

            const availableBalance = prevContext.wallet.availableBalance ?? 0;
            if (availableBalance < prevContext.payableAmount) {
              return { ...prevContext, state: 'insufficient_funds', isLoading: false };
            }

            createTransaction(
              {
                appointmentId,
                paymentMethod: 'Wallet',
                walletId: prevContext.wallet._id || prevContext.wallet.id,
                walletAmount: prevContext.payableAmount,
                discountId: prevContext.discount?._id || prevContext.discount?.id,
                supportCardId: prevContext.supportCard?.supportCardId,
                supportCardAmount: prevContext.supportCard?.amount,
                status: 'Completed',
              },
              {
                onSuccess: (data) => {
                  const transactionId = data?.transaction?._id || data?.transaction?.id;
                  if (!transactionId) {
                    setState({ state: 'error', isLoading: false });
                    return;
                  }
                  setState({
                    state: 'success',
                    isLoading: false,
                    transactionId,
                  });
                },
                onError: () => {
                  setState({ state: 'error', isLoading: false });
                },
              },
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

            createCheckout(
              {
                amount: prevContext.payableAmount,
                paymentMethod: paymentBrand,
                appointmentId,
                discountId: prevContext.discount?._id || prevContext.discount?.id,
                supportCardId: prevContext.supportCard?.supportCardId,
                supportCardAmount: prevContext.supportCard?.amount,
              },
              {
                onSuccess: (data) => {
                  setState({ checkoutId: data.id });
                },
                onError: () => {
                  setState({ state: 'error', isLoading: false });
                },
              },
            );
          }

          return { ...prevContext, state: 'processing', isLoading: true };
        });
      },
      handlePaymentCompleted: () => {
        setState({ state: 'processing' });
      },
      verifyPayment: async (checkoutId, appointment) => {
        try {
          const appointmentId = appointment?._id || appointment?.id;
          const statusResult = await checkPaymentStatus({
            checkoutId,
            appointmentId,
          });
          if (statusResult.success) {
            setState({
              state: 'success',
              isLoading: false,
              transactionId: statusResult.data?.transaction?._id || statusResult.data?.transaction?.id,
            });
          } else {
            setState({ state: 'error', isLoading: false });
          }
        } catch {
          setState({ state: 'error', isLoading: false });
        }
      },
      retry: () => {
        setState({ state: 'idle', checkoutId: null, isLoading: false });
      },
    };
  }, [createTransaction, createCheckout, checkPaymentStatus, setState]);

  return { context, actions };
};
