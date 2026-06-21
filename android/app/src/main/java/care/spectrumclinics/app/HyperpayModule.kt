package care.spectrumclinics.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.oppwa.mobile.connect.exception.PaymentError
import com.oppwa.mobile.connect.exception.PaymentException
import com.oppwa.mobile.connect.payment.PaymentParams
import com.oppwa.mobile.connect.payment.card.CardPaymentParams
import com.oppwa.mobile.connect.provider.Connect
import com.oppwa.mobile.connect.provider.ITransactionListener
import com.oppwa.mobile.connect.provider.OppPaymentProvider
import com.oppwa.mobile.connect.provider.Transaction
import com.oppwa.mobile.connect.provider.TransactionType
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * ============================================================================
 * Hyperpay Payment Module for React Native
 * ============================================================================
 *
 * This module handles payment processing through the Hyperpay SDK
 * Supports: Card Payments (VISA, Master, MADA), STCPay
 *
 * @author Hamzeh Altamimi
 * @date 29/7/2025
 */
class HyperpayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    ITransactionListener {

    // ============================================================================
    // MARK: - Constants
    // ============================================================================

    companion object {
        private const val TAG = "HyperpayModule"

        // Configuration
        private const val SHOPPER_RESULT_URL = "spectrum://payment/result"

        // Payment Brands
        private const val PAYMENT_BRAND_VISA = "VISA"
        private const val PAYMENT_BRAND_MASTER = "MASTER"
        private const val PAYMENT_BRAND_MADA = "MADA"
        private const val PAYMENT_BRAND_PAYPAL = "PAYPAL"
        private const val PAYMENT_BRAND_STCPAY = "STCPAY"

        // Event Names
        private const val EVENT_PAYMENT_STATUS = "PaymentStatusEvent"

        // Status Values
        private const val STATUS_SUCCESS = "success"
        private const val STATUS_ERROR = "error"
        private const val STATUS_REDIRECTING = "redirecting"
        private const val STATUS_CANCELLED = "cancelled"
        private const val STATUS_CHECKOUT_ERROR = "checkout_error"
    }

    // ============================================================================
    // MARK: - Properties
    // ============================================================================

    private var provider: OppPaymentProvider? = null
    private var transaction: Transaction? = null
    private var checkoutId: String? = null
    private var resourcePath: String? = null
    private var paymentType: String? = null
    private val paymentMode = Connect.ProviderMode.LIVE // Production environment

    // ============================================================================
    // MARK: - Module Setup
    // ============================================================================

    override fun getName() = "Hyperpay"

    init {
        Log.d(TAG, "HyperpayModule initialized successfully")
        Log.d(TAG, "Module name: ${getName()}")
        Log.d(TAG, "Default payment mode: LIVE")
    }

    // ============================================================================
    // MARK: - Helper Methods
    // ============================================================================

    /**
     * Send payment status event to React Native
     */
    private fun sendPaymentStatus(status: String, info: Map<String, Any>? = null) {
        val body = Arguments.createMap().apply {
            putString("status", status)
            info?.forEach { (key, value) ->
                when (value) {
                    is String -> putString(key, value)
                    is Int -> putInt(key, value)
                    is Boolean -> putBoolean(key, value)
                    is Double -> putDouble(key, value)
                }
            }
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_PAYMENT_STATUS, body)
    }

    /**
     * Validate card payment parameters
     */
    private fun validateCardParams(
        checkoutId: String,
        paymentBrands: String,
        cardHolder: String,
        cardNumber: String,
        expiryYear: String,
        expiryMonth: String,
        cvv: String
    ): List<String> {
        val errors = mutableListOf<String>()

        if (checkoutId.isBlank()) errors.add("Checkout ID")
        if (paymentBrands.isBlank()) errors.add("Payment brand")
        if (cardHolder.isBlank()) errors.add("Card holder")
        if (cardNumber.isBlank()) errors.add("Card number")
        if (expiryYear.isBlank()) errors.add("Expiry year")
        if (expiryMonth.isBlank()) errors.add("Expiry month")
        if (cvv.isBlank()) errors.add("CVV")

        return errors
    }

    /**
     * Open redirect URL in browser
     */
    private fun openRedirectUrl(redirectUrl: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(redirectUrl))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "Redirect URL opened automatically")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open redirect URL: ${e.message}")
            sendPaymentStatus(STATUS_ERROR, mapOf(
                "message" to "Failed to open payment page",
                "paymentType" to (paymentType ?: "unknown")
            ))
        }
    }

    // ============================================================================
    // MARK: - Card Payment Methods (VISA, Master, MADA)
    // ============================================================================

    /**
     * Ready UI for VISA, MASTER, MADA - Main method used by custom UI component
     * Android uses direct transaction submission since checkout provider is not available in this SDK version
     */
    @ReactMethod
    fun transactionPaymentReady(checkoutID: String) {
        Log.d(TAG, "Transaction started with Checkout ID: $checkoutID")

        // Validate checkout ID
        if (checkoutID.isBlank()) {
            Log.e(TAG, "Invalid checkout ID provided")
            sendPaymentStatus(STATUS_CHECKOUT_ERROR, mapOf("message" to "Invalid checkout ID"))
            return
        }

        // Store the checkout ID for later use
        this.checkoutId = checkoutID

        Log.d(TAG, "Checkout ID validation:")
        Log.d(TAG, "   ID: $checkoutID")
        Log.d(TAG, "   Length: ${checkoutID.length}")

        try {
            // Initialize payment provider
            provider = OppPaymentProvider(reactApplicationContext, paymentMode)
            Log.d(TAG, "Payment provider initialized")

            // Use PAYPAL brand to force async behavior for redirect URLs
            val paymentParams = PaymentParams(checkoutID, PAYMENT_BRAND_PAYPAL).apply {
                shopperResultUrl = SHOPPER_RESULT_URL
            }

            transaction = Transaction(paymentParams)
            provider!!.submitTransaction(transaction!!, this)
            provider!!.setThreeDSWorkflowListener { getCurrentActivity() }

            Log.d(TAG, "Transaction submitted successfully")

        } catch (e: Exception) {
            Log.e(TAG, "Exception in transactionPaymentReady: ${e.message}")
            sendPaymentStatus(STATUS_CHECKOUT_ERROR, mapOf("message" to (e.message ?: "Unknown error")))
        }
    }

    /**
     * Check payment status after redirect
     * Returns the checkoutID as resourcePath for payment verification on backend
     */
    @ReactMethod
    fun checkPaymentStatus(checkoutID: String, callback: Callback) {
        Log.d(TAG, "Checking payment status for checkout ID: $checkoutID")

        try {
            // Return checkoutID as resourcePath - backend will verify the actual status
            resourcePath = checkoutID

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("resourcePath", checkoutID)
            }
            callback.invoke(result)
            Log.d(TAG, "Payment status check completed with resourcePath: $checkoutID")
        } catch (e: Exception) {
            Log.e(TAG, "Exception checking payment status: ${e.message}")
            val result = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", e.message ?: "Unknown error")
            }
            callback.invoke(result)
        }
    }

    /**
     * Legacy card transaction payment method for backward compatibility
     */
    @ReactMethod
    fun transactionPayment(
        checkoutId: String,
        paymentBrands: String,
        CardHolder: String,
        cardNumber: String,
        expiryYear: String,
        expiryMonth: String,
        cvv: String,
        paymentType: String,
        promise: Promise
    ) {
        try {
            // Validate all required parameters
            val validationErrors = validateCardParams(
                checkoutId, paymentBrands, CardHolder,
                cardNumber, expiryYear, expiryMonth, cvv
            )

            if (validationErrors.isNotEmpty()) {
                promise.reject("VALIDATION_ERROR", "Missing required fields: ${validationErrors.joinToString(", ")}")
                return
            }

            // Store for later use
            this.checkoutId = checkoutId
            this.paymentType = paymentType

            Log.d(TAG, "Processing transaction for brand: $paymentBrands")
            Log.d(TAG, "   Card Number: ${cardNumber.take(4)}...${cardNumber.takeLast(4)}")

            val cardPaymentParams = CardPaymentParams(
                checkoutId,
                paymentBrands,
                cardNumber,
                CardHolder,
                expiryMonth,
                expiryYear,
                cvv
            ).apply {
                shopperResultUrl = SHOPPER_RESULT_URL
            }

            try {
                val paymentProvider = OppPaymentProvider(reactApplicationContext, paymentMode)
                val transaction = Transaction(cardPaymentParams)
                paymentProvider.submitTransaction(transaction, this)
                paymentProvider.setThreeDSWorkflowListener { getCurrentActivity() }

                promise.resolve(null)
                Log.d(TAG, "Transaction submitted successfully")
            } catch (ee: PaymentException) {
                Log.e(TAG, "PaymentException: ${ee.message}")
                promise.reject("PAYMENT_EXCEPTION", ee.message ?: "Unknown payment error")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}")
            promise.reject("GENERAL_EXCEPTION", e.message ?: "Unknown error")
        }
    }

    // ============================================================================
    // MARK: - STCPay Payment
    // ============================================================================

    /**
     * Legacy STCPay payment method for backward compatibility
     */
    @ReactMethod
    fun stcpayPayment(checkoutId: String, PaymentBrand: String, promise: Promise) {
        try {
            // Validate required parameters
            if (checkoutId.isBlank()) {
                promise.reject("INVALID_CHECKOUT_ID", "Checkout ID cannot be empty")
                return
            }

            if (PaymentBrand.isBlank()) {
                promise.reject("INVALID_PAYMENT_BRAND", "Payment brand cannot be empty")
                return
            }

            val paymentParams = PaymentParams(checkoutId, PaymentBrand).apply {
                shopperResultUrl = SHOPPER_RESULT_URL
            }

            try {
                val paymentProvider = OppPaymentProvider(reactApplicationContext, paymentMode)
                val transaction = Transaction(paymentParams)
                paymentProvider.submitTransaction(transaction, this)
                paymentProvider.setThreeDSWorkflowListener { getCurrentActivity() }

                promise.resolve(null)
                Log.d(TAG, "STCPay transaction submitted")
            } catch (ee: PaymentException) {
                Log.e(TAG, "PaymentException: ${ee.message}")
                promise.reject("PAYMENT_EXCEPTION", ee.message ?: "Unknown payment error")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}")
            promise.reject("GENERAL_EXCEPTION", e.message ?: "Unknown error")
        }
    }

    // ============================================================================
    // MARK: - ITransactionListener Implementation
    // ============================================================================

    /**
     * Called when transaction completes successfully
     */
    @ExperimentalCoroutinesApi
    override fun transactionCompleted(transaction: Transaction) {
        Log.d(TAG, "Transaction completed")
        Log.d(TAG, "   Transaction type: ${transaction.transactionType}")
        Log.d(TAG, "   Redirect URL: ${transaction.redirectUrl}")

        if (transaction.transactionType == TransactionType.SYNC) {
            handleSynchronousTransaction()
        } else {
            handleAsynchronousTransaction(transaction)
        }
    }

    /**
     * Called when transaction fails
     */
    override fun transactionFailed(transaction: Transaction, paymentError: PaymentError) {
        val errorMessage = try {
            paymentError.toString()
        } catch (e: Exception) {
            "Transaction failed - Error code: ${paymentError.errorCode}"
        }

        Log.e(TAG, "Transaction failed: $errorMessage")
        Log.e(TAG, "   Error code: ${paymentError.errorCode}")

        sendPaymentStatus(STATUS_ERROR, mapOf(
            "message" to errorMessage,
            "errorCode" to paymentError.errorCode.toString()
        ))
    }

    // ============================================================================
    // MARK: - Transaction Handlers
    // ============================================================================

    /**
     * Handle synchronous transaction completion
     */
    private fun handleSynchronousTransaction() {
        Log.d(TAG, "Synchronous transaction completed")

        val resPath = resourcePath ?: checkoutId ?: "unknown"

        // Check if this should have been async
        if (resPath == "unknown" && checkoutId != null) {
            Log.d(TAG, "Synchronous transaction with unknown resourcePath")

            try {
                val provider = OppPaymentProvider(reactApplicationContext, paymentMode)
                Log.d(TAG, "Using checkoutId as resourcePath: $checkoutId")
                resourcePath = checkoutId

                sendPaymentStatus(STATUS_SUCCESS, mapOf(
                    "resourcePath" to checkoutId!!,
                    "paymentType" to (paymentType ?: "unknown")
                ))
            } catch (e: Exception) {
                Log.e(TAG, "Error checking payment status: ${e.message}")
                sendPaymentStatus(STATUS_SUCCESS, mapOf(
                    "resourcePath" to checkoutId!!,
                    "paymentType" to (paymentType ?: "unknown")
                ))
            }
        } else {
            sendPaymentStatus(STATUS_SUCCESS, mapOf(
                "resourcePath" to resPath,
                "paymentType" to (paymentType ?: "unknown")
            ))
        }
    }

    /**
     * Handle asynchronous transaction with redirect
     */
    private fun handleAsynchronousTransaction(transaction: Transaction) {
        val redirectUrl = transaction.redirectUrl

        if (redirectUrl != null) {
            Log.d(TAG, "Asynchronous transaction - Redirect URL: $redirectUrl")

            sendPaymentStatus(STATUS_REDIRECTING, mapOf(
                "redirectURL" to redirectUrl,
                "paymentType" to (paymentType ?: "unknown")
            ))

            // Automatically open the redirect URL
            openRedirectUrl(redirectUrl)
        } else {
            Log.e(TAG, "No redirect URL for async transaction")
            sendPaymentStatus(STATUS_ERROR, mapOf(
                "message" to "No redirect URL for async transaction",
                "paymentType" to (paymentType ?: "unknown")
            ))
        }
    }
}
