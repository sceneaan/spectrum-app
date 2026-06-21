#import "HyperpayModule.h"
#import <UIKit/UIKit.h>
#import <SafariServices/SafariServices.h>
#import <PassKit/PassKit.h>

// ============================================================================
// MARK: - Constants
// ============================================================================

static NSString *const kShopperResultURL = @"com.spectrum.payments://result";
static NSString *const kAppBundleID = @"org.reactApp.spectrum";
static NSString *const kMerchantID = @"merchant.spectrumclinics.care";
static NSString *const kEventPaymentStatus = @"PaymentStatusEvent";

// Payment Brands
static NSString *const kPaymentBrandVISA = @"VISA";
static NSString *const kPaymentBrandMASTER = @"MASTER";
static NSString *const kPaymentBrandPAYPAL = @"PAYPAL";
static NSString *const kPaymentBrandAPPLEPAY = @"APPLEPAY";

// Status Values
static NSString *const kStatusSuccess = @"success";
static NSString *const kStatusError = @"error";
static NSString *const kStatusRedirecting = @"redirecting";
static NSString *const kStatusCancelled = @"cancelled";
static NSString *const kStatusCheckoutError = @"checkout_error";
static NSString *const kStatusApplePaySuccess = @"applepay_success";

// ============================================================================
// MARK: - Interface Extension
// ============================================================================

@interface HyperpayModule () <SFSafariViewControllerDelegate, PKPaymentAuthorizationViewControllerDelegate, OPPThreeDSEventListener>

@property (nonatomic, strong) OPPPaymentProvider *provider;
@property (nonatomic, strong) OPPTransaction *transaction;
@property (nonatomic, strong) NSString *checkoutID;
@property (nonatomic, strong) NSString *resourcePath;
@property (nonatomic, assign) BOOL dataCollector;
@property (nonatomic, strong) OPPCheckoutProvider *checkoutProvider;
@property (nonatomic, strong) UINavigationController *current3DSNavigationController;

@end

// ============================================================================
// MARK: - Implementation
// ============================================================================

@implementation HyperpayModule

RCT_EXPORT_MODULE(Hyperpay);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        NSLog(@"🔧 HyperpayModule initialized successfully");
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[kEventPaymentStatus];
}

// ============================================================================
// MARK: - Helper Methods
// ============================================================================

- (UIViewController *)topMostViewController {
    UIWindow *keyWindow = [UIApplication sharedApplication].delegate.window;
    UIViewController *rootViewController = keyWindow.rootViewController;
    while (rootViewController.presentedViewController) {
        rootViewController = rootViewController.presentedViewController;
    }
    return rootViewController;
}

- (void)sendPaymentStatus:(NSString *)status info:(NSDictionary * _Nullable)info {
    NSMutableDictionary *body = [NSMutableDictionary dictionaryWithObject:status forKey:@"status"];
    if (info != nil) {
        [body addEntriesFromDictionary:info];
    }
    [self sendEventWithName:kEventPaymentStatus body:body];
}

- (void)dismissAllPresentedViewControllers:(UIViewController *)vc completion:(void (^)(void))completion {
    if (vc.presentedViewController) {
        [vc.presentedViewController dismissViewControllerAnimated:YES completion:^{
            [self dismissAllPresentedViewControllers:vc completion:completion];
        }];
    } else {
        if (completion) completion();
    }
}

- (void)dismissNavigationControllerIfNeeded {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIWindow *keyWindow = [UIApplication sharedApplication].delegate.window;
        UIViewController *rootVC = keyWindow.rootViewController;
        [self dismissAllPresentedViewControllers:rootVC completion:^{
            NSLog(@"All presented view controllers dismissed.");
        }];
    });
}

// ============================================================================
// MARK: - 3D Secure (3DS) Methods
// ============================================================================

- (void)onThreeDSChallengeRequiredWithCompletion:(void (^)(UINavigationController *))completion {
    @try {
        NSLog(@"🔐 3DS Challenge Required - Creating navigation controller");
        
        // Create view controller for 3DS challenge
        UIViewController *challengeVC = [[UIViewController alloc] init];
        challengeVC.view.backgroundColor = [UIColor whiteColor];
        challengeVC.title = @"3D Secure Authentication";
        
        // Add info label
        UILabel *infoLabel = [[UILabel alloc] init];
        infoLabel.text = @"Please complete the 3D Secure authentication challenge to continue with your payment.";
        infoLabel.numberOfLines = 0;
        infoLabel.textAlignment = NSTextAlignmentCenter;
        infoLabel.font = [UIFont systemFontOfSize:16];
        infoLabel.textColor = [UIColor darkGrayColor];
        infoLabel.translatesAutoresizingMaskIntoConstraints = NO;
        [challengeVC.view addSubview:infoLabel];
        
        // Center the label
        [NSLayoutConstraint activateConstraints:@[
            [infoLabel.centerXAnchor constraintEqualToAnchor:challengeVC.view.centerXAnchor],
            [infoLabel.centerYAnchor constraintEqualToAnchor:challengeVC.view.centerYAnchor],
            [infoLabel.leadingAnchor constraintEqualToAnchor:challengeVC.view.leadingAnchor constant:20],
            [infoLabel.trailingAnchor constraintEqualToAnchor:challengeVC.view.trailingAnchor constant:-20]
        ]];
        
        // Create navigation controller
        UINavigationController *navController = [[UINavigationController alloc] initWithRootViewController:challengeVC];
        navController.modalPresentationStyle = UIModalPresentationFullScreen;
        
        // Present on main thread
        dispatch_async(dispatch_get_main_queue(), ^{
            UIViewController *rootVC = [self topMostViewController];
            if (rootVC) {
                [rootVC presentViewController:navController animated:YES completion:^{
                    NSLog(@"🔐 3DS challenge navigation controller presented successfully");
                }];
            }
        });

        completion(navController);
        self.current3DSNavigationController = navController;
        
    } @catch (NSException *exception) {
        NSLog(@"❌ Exception in onThreeDSChallengeRequired: %@", exception.reason);
        completion(nil);
    }
}

- (void)onThreeDSConfigRequiredWithCompletion:(void (^)(OPPThreeDSConfig *))completion {
    @try {
        OPPThreeDSConfig *config = [[OPPThreeDSConfig alloc] init];
        self.dataCollector = YES;
        config.appBundleID = kAppBundleID;
        NSLog(@"🔐 3DS Config created with Bundle ID: %@", config.appBundleID);
        completion(config);
    } @catch (NSException *exception) {
        NSLog(@"❌ Exception in onThreeDSConfigRequired: %@", exception.reason);
    }
}

- (void)dismiss3DSNavigationController {
    if (self.current3DSNavigationController) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.current3DSNavigationController dismissViewControllerAnimated:YES completion:^{
                NSLog(@"🔐 3DS navigation controller dismissed successfully");
                self.current3DSNavigationController = nil;
            }];
        });
    }
}

- (void)cleanup3DSNavigationController {
    if (self.current3DSNavigationController) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.current3DSNavigationController dismissViewControllerAnimated:YES completion:^{
                NSLog(@"🔐 3DS navigation controller cleaned up on error");
                self.current3DSNavigationController = nil;
            }];
        });
    }
}

- (OPPCheckoutSettings *)configureCheckoutSettings {
    OPPCheckoutSettings *checkoutSettings = [[OPPCheckoutSettings alloc] init];
    checkoutSettings.paymentBrands = @[kPaymentBrandVISA, kPaymentBrandMASTER, kPaymentBrandPAYPAL];
    checkoutSettings.shopperResultURL = kShopperResultURL;

    // Enable 3DS
    OPPThreeDSConfig *threeDS2Config = [[OPPThreeDSConfig alloc] init];
    threeDS2Config.appBundleID = kAppBundleID;
    checkoutSettings.threeDSConfig = threeDS2Config;
    
    NSLog(@"🔧 Checkout settings configured with 3DS enabled");
    return checkoutSettings;
}

// ============================================================================
// MARK: - Card Payment Methods (VISA, Master, MADA)
// ============================================================================

RCT_EXPORT_METHOD(transactionPayment:(NSString *)checkoutID
                  paymentBrand:(NSString *)paymentBrand
                  cardHolder:(NSString *)cardHolder
                  cardNumber:(NSString *)cardNumber
                  expiryYear:(NSString *)expiryYear
                  expiryMonth:(NSString *)expiryMonth
                  cvv:(NSString *)cvv
                  paymentType:(NSString *)paymentType) {
    @try {
        NSError *error = nil;
        OPPCardPaymentParams *params = [OPPCardPaymentParams cardPaymentParamsWithCheckoutID:checkoutID
                                                                                paymentBrand:paymentBrand
                                                                                      holder:cardHolder
                                                                                      number:cardNumber
                                                                                 expiryMonth:expiryMonth
                                                                                  expiryYear:expiryYear
                                                                                         CVV:cvv
                                                                                       error:&error];
        if (error) {
            NSLog(@"Error creating payment params: %@", error.localizedDescription);
            [self sendPaymentStatus:@"error_creating_params" info:@{@"message": error.localizedDescription}];
            return;
        }

        self.provider = [OPPPaymentProvider paymentProviderWithMode:OPPProviderModeLive];
        self.provider.threeDSEventListener = self;
        params.shopperResultURL = kShopperResultURL;
        self.transaction = [OPPTransaction transactionWithPaymentParams:params];

        [self.provider submitTransaction:self.transaction completionHandler:^(OPPTransaction* transaction, NSError* error) {
            if (error) {
                NSLog(@"Error submitting transaction: %@", error.localizedDescription);
                [self cleanup3DSNavigationController];
                [self sendPaymentStatus:@"error_submitting_transaction" info:@{@"message": error.localizedDescription}];
            } else if (transaction.type == OPPTransactionTypeAsynchronous) {
                [self handleAsyncTransaction:transaction paymentType:paymentType];
            } else {
                [self handleSyncTransaction:transaction checkoutID:checkoutID paymentType:paymentType paymentBrand:paymentBrand];
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"Exception in transactionPayment: %@", exception.reason);
        [self cleanup3DSNavigationController];
        [self sendPaymentStatus:@"exception" info:@{@"message": exception.reason}];
    }
}

RCT_EXPORT_METHOD(transactionPaymentReady:(NSString *)checkoutID) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"🚀 Transaction started with Checkout ID: %@", checkoutID);
        
        if (!checkoutID || [checkoutID length] == 0) {
            [self sendPaymentStatus:kStatusCheckoutError info:@{@"message": @"Invalid checkout ID"}];
            return;
        }

        @try {
            OPPPaymentProvider *provider = [OPPPaymentProvider paymentProviderWithMode:OPPProviderModeLive];
            OPPCheckoutSettings *checkoutSettings = [self configureCheckoutSettings];
            self.checkoutProvider = [OPPCheckoutProvider checkoutProviderWithPaymentProvider:provider
                                                                                  checkoutID:checkoutID
                                                                                    settings:checkoutSettings];

            UIViewController *rootVC = [self topMostViewController];
            if (!rootVC) {
                [self sendPaymentStatus:kStatusCheckoutError info:@{@"message": @"Could not present checkout UI"}];
                return;
            }

            [self.checkoutProvider presentCheckoutForSubmittingTransactionCompletionHandler:^(OPPTransaction * _Nonnull transaction, NSError * _Nullable error) {
                if (error) {
                    NSLog(@"❌ Error in checkout: %@", error.localizedDescription);
                    [self sendPaymentStatus:kStatusCheckoutError info:@{@"message": error.localizedDescription}];
                } else if (transaction.type == OPPTransactionTypeSynchronous) {
                    [self handleSyncTransaction:transaction checkoutID:checkoutID paymentType:nil paymentBrand:nil];
                } else {
                    [self handleAsyncTransaction:transaction paymentType:nil];
                }
            } cancelHandler:^{
                NSLog(@"❌ Checkout cancelled by shopper");
                [self sendPaymentStatus:kStatusCancelled info:nil];
            }];
            
        } @catch (NSException *exception) {
            NSLog(@"❌ Exception in transactionPaymentReady: %@", exception.reason);
            [self sendPaymentStatus:kStatusCheckoutError info:@{@"message": exception.reason}];
        }
    });
}

RCT_EXPORT_METHOD(checkPaymentStatus:(NSString *)checkoutID callback:(RCTResponseSenderBlock)callback) {
    NSLog(@"🔍 Checking payment status for checkout ID: %@", checkoutID);
    
    @try {
        OPPPaymentProvider *provider = [OPPPaymentProvider paymentProviderWithMode:OPPProviderModeLive];
        
        [provider requestCheckoutInfoWithCheckoutID:checkoutID completionHandler:^(OPPCheckoutInfo* checkoutInfo, NSError* error) {
            if (error) {
                callback(@[@{@"success": @NO, @"error": error.localizedDescription}]);
            } else {
                self.resourcePath = checkoutInfo.resourcePath;
                [self dismiss3DSNavigationController];
                callback(@[@{@"success": @YES, @"resourcePath": checkoutInfo.resourcePath ?: checkoutID}]);
            }
        }];
    } @catch (NSException *exception) {
        callback(@[@{@"success": @NO, @"error": exception.reason}]);
    }
}

// Transaction handler helpers
- (void)handleAsyncTransaction:(OPPTransaction *)transaction paymentType:(NSString *)paymentType {
    if (transaction.redirectURL) {
        NSURL *url = transaction.redirectURL;
        NSLog(@"🔄 Redirect URL: %@", url.absoluteString);
        
        dispatch_async(dispatch_get_main_queue(), ^{
            UIApplication *application = [UIApplication sharedApplication];
            if ([application canOpenURL:url]) {
                [application openURL:url options:@{} completionHandler:nil];
                [self sendPaymentStatus:kStatusRedirecting info:@{
                    @"redirectURL": url.absoluteString,
                    @"paymentType": paymentType ?: @"unknown"
                }];
            } else {
                [self sendPaymentStatus:@"cannot_open_redirect_url" info:@{@"paymentType": paymentType ?: @"unknown"}];
            }
        });
    } else {
        [self sendPaymentStatus:@"redirect_url_null" info:@{}];
    }
}

- (void)handleSyncTransaction:(OPPTransaction *)transaction
                   checkoutID:(NSString *)checkoutID
                  paymentType:(NSString *)paymentType
                  paymentBrand:(NSString *)paymentBrand {
    NSLog(@"✅ Synchronous transaction completed");
    [self dismissNavigationControllerIfNeeded];
    [self dismiss3DSNavigationController];
    NSString *resPath = self.resourcePath ?: checkoutID;
    [self sendPaymentStatus:kStatusSuccess info:@{
        @"resourcePath": resPath,
        @"paymentType": paymentType ?: @"unknown"
    }];
}

// ============================================================================
// MARK: - STCPay Payment
// ============================================================================

RCT_EXPORT_METHOD(stcpayPayment:(NSString *)checkoutID paymentBrand:(NSString *)paymentBrand) {
    @try {
        NSError *error = nil;
        OPPPaymentParams *params = [OPPPaymentParams paymentParamsWithCheckoutID:checkoutID paymentBrand:paymentBrand error:&error];

        if (error) {
            [self sendPaymentStatus:@"error_creating_params" info:@{@"message": error.localizedDescription}];
            return;
        }

        self.provider = [OPPPaymentProvider paymentProviderWithMode:OPPProviderModeLive];
        self.provider.threeDSEventListener = self;
        params.shopperResultURL = kShopperResultURL;
        self.transaction = [OPPTransaction transactionWithPaymentParams:params];

        [self.provider submitTransaction:self.transaction completionHandler:^(OPPTransaction* transaction, NSError* error) {
            if (error) {
                [self cleanup3DSNavigationController];
                [self sendPaymentStatus:@"error_submitting_transaction" info:@{@"message": error.localizedDescription}];
            } else if (transaction.type == OPPTransactionTypeAsynchronous && transaction.redirectURL) {
                [self sendPaymentStatus:kStatusRedirecting info:@{@"redirectURL": transaction.redirectURL.absoluteString}];
            } else {
                [self dismissNavigationControllerIfNeeded];
                NSString *resPath = self.resourcePath ?: checkoutID;
                [self sendPaymentStatus:kStatusSuccess info:@{@"resourcePath": resPath}];
            }
        }];
    } @catch (NSException *exception) {
        [self cleanup3DSNavigationController];
        [self sendPaymentStatus:@"exception" info:@{@"message": exception.reason}];
    }
}

// ============================================================================
// MARK: - Apple Pay Payment
// ============================================================================

#pragma mark - Apple Pay Payment
 
RCT_EXPORT_METHOD(ApplepayPayments:(NSString *)checkoutID amount:(NSNumber *)amount){
    @try {
        self.checkoutID = checkoutID;
        
        // 🔥 FIX 1: Initialize provider before using it
        self.provider = [OPPPaymentProvider paymentProviderWithMode:OPPProviderModeLive];
        
        // 🔥 FIX 2: Better variable naming to avoid shadowing parameter
        NSDecimalNumber *paymentAmount;
        if (amount && [amount doubleValue] > 0) {
            paymentAmount = [NSDecimalNumber decimalNumberWithString:[amount stringValue]];
        } else {
            // Fallback to a default amount if invalid
            paymentAmount = [NSDecimalNumber decimalNumberWithMantissa:100 exponent:-2 isNegative:NO];
        }
        
        NSLog(@"🍎 Apple Pay Request - Amount: %@, CheckoutID: %@", paymentAmount, checkoutID);
 
        PKPaymentRequest *request = [OPPPaymentProvider paymentRequestWithMerchantIdentifier:kMerchantID countryCode:@"SA"];
        request.currencyCode = @"SAR";
        
        // 🔥 FIX 3: Add merchant capabilities and supported networks
        request.merchantCapabilities = PKMerchantCapability3DS;
        request.supportedNetworks = @[PKPaymentNetworkVisa, PKPaymentNetworkMasterCard, PKPaymentNetworkMada];
        
        // 🔥 FIX 4: Use paymentAmount variable consistently
        request.paymentSummaryItems = @[
            [PKPaymentSummaryItem summaryItemWithLabel:@"spectrum" amount:paymentAmount]
        ];
        
        // 🔥 FIX 5: Check if payment request can be submitted
        BOOL canSubmit = [OPPPaymentProvider canSubmitPaymentRequest:request];
        
        if (canSubmit) {
            PKPaymentAuthorizationViewController *vc = [[PKPaymentAuthorizationViewController alloc] initWithPaymentRequest:request];
            if (vc) {
                vc.delegate = self;
                dispatch_async(dispatch_get_main_queue(), ^{
                    UIViewController *rootVC = [self topMostViewController];
                    if (rootVC) {
                        [rootVC presentViewController:vc animated:YES completion:^{
                            NSLog(@"🍎 Apple Pay view controller presented successfully");
                        }];
                    } else {
                        NSLog(@"❌ Could not get root view controller for Apple Pay");
                        [self sendPaymentStatus:@"apple_pay_presentation_error" info:@{@"message": @"Could not get root view controller"}];
                    }
                });
            } else {
                NSLog(@"❌ Failed to create Apple Pay view controller");
                [self sendPaymentStatus:@"apple_pay_creation_error" info:@{@"message": @"Failed to create Apple Pay view controller"}];
            }
        } else {
            NSLog(@"❌ Apple Pay not supported on this device");
            [self sendPaymentStatus:@"apple_pay_not_supported" info:@{@"message": @"Apple Pay not supported on this device"}];
        }
    } @catch (NSException *exception) {
        NSLog(@"❌ Exception in ApplepayPayments: %@", exception.reason);
        [self sendPaymentStatus:@"exception" info:@{@"message": exception.reason}];
    }
}
#pragma mark - PKPaymentAuthorizationViewControllerDelegate

- (void)paymentAuthorizationViewController:(PKPaymentAuthorizationViewController *)controller
                      didAuthorizePayment:(PKPayment *)payment
                               completion:(void (^)(PKPaymentAuthorizationStatus))completion {
    @try {
        NSLog(@"🍎 Apple Pay authorization received");
        
        if (!self.checkoutID || [self.checkoutID length] == 0) {
            NSLog(@"❌ Checkout ID is empty");
            [self sendPaymentStatus:@"error_creating_applepay_params" info:@{@"message": @"Checkout ID is empty"}];
            completion(PKPaymentAuthorizationStatusFailure);
            return;
        }
        
        if (!payment.token.paymentData || [payment.token.paymentData length] == 0) {
            NSLog(@"❌ Payment token data is empty");
            
            // Check if running on simulator
            #if TARGET_OS_SIMULATOR
                NSLog(@"⚠️ Running on iOS Simulator - Apple Pay tokens are not generated on simulator");
                NSLog(@"⚠️ Please test on a real physical device to get actual payment tokens");
                [self sendPaymentStatus:@"error_creating_applepay_params" info:@{
                    @"message": @"Apple Pay doesn't work on simulator. Please test on a real device.",
                    @"isSimulator": @YES
                }];
            #else
                NSLog(@"❌ Payment token data is empty on real device");
                NSLog(@"❌ Please ensure:");
                NSLog(@"   1. Valid test cards are added to Apple Wallet");
                NSLog(@"   2. Merchant ID '%@' is properly configured", kMerchantID);
                NSLog(@"   3. Apple Pay is enabled in device Settings");
                [self sendPaymentStatus:@"error_creating_applepay_params" info:@{
                    @"message": @"Payment token data is empty. Please add test cards to Apple Wallet.",
                    @"isSimulator": @NO
                }];
            #endif
            
            completion(PKPaymentAuthorizationStatusFailure);
            return;
        }
        
        NSError *error;
        
        // 🔥 FIX: Create Apple Pay payment params with proper token data
        OPPApplePayPaymentParams *params = [[OPPApplePayPaymentParams alloc] initWithCheckoutID:self.checkoutID
                                                                                    paymentBrand:kPaymentBrandAPPLEPAY
                                                                                       tokenData:payment.token.paymentData
                                                                                  billingContact:payment.billingContact
                                                                                 shippingContact:payment.shippingContact
                                                                                           error:&error];
        
        // 🔥 FIX: Set shopper result URL for proper callback handling
        params.shopperResultURL = kShopperResultURL;
        
        NSLog(@"🍎 Apple Pay Payment Params - CheckoutID: %@, TokenData Length: %lu", self.checkoutID, (unsigned long)payment.token.paymentData.length);
       
        if (!params) {
            NSLog(@"❌ Failed to create Apple Pay payment params: %@", error.localizedDescription);
            NSLog(@"❌ Error details: %@", error.userInfo);
            [self sendPaymentStatus:@"error_creating_applepay_params" info:@{
                @"message": error.localizedDescription,
                @"errorCode": @(error.code),
                @"errorDetails": error.userInfo ?: @{}
            }];
            completion(PKPaymentAuthorizationStatusFailure);
            return;
        }
        
        NSLog(@"✅ Apple Pay payment params created successfully");
 
        self.transaction = [OPPTransaction transactionWithPaymentParams:params];
        
        NSLog(@"🍎 Submitting Apple Pay transaction to Hyperpay...");
        [self.provider submitTransaction:self.transaction completionHandler:^(OPPTransaction * _Nonnull transaction, NSError * _Nullable error) {
            if (error) {
                NSLog(@"❌ Apple Pay transaction failed: %@", error.localizedDescription);
                NSLog(@"❌ Error code: %ld", (long)error.code);
                NSLog(@"❌ Error userInfo: %@", error.userInfo);
                
                // 🔥 FIX: Send detailed error information for debugging
                [self sendPaymentStatus:@"applepay_transaction_failed" info:@{
                    @"message": error.localizedDescription,
                    @"errorCode": @(error.code),
                    @"errorDetails": error.userInfo ?: @{},
                    @"checkoutID": self.checkoutID ?: @"unknown"
                }];
                completion(PKPaymentAuthorizationStatusFailure);
                return;
            }
            
            NSLog(@"✅ Apple Pay transaction submitted successfully");
           
            NSLog(@"🍎 Requesting checkout info for Apple Pay...");
            [self.provider requestCheckoutInfoWithCheckoutID:self.checkoutID completionHandler:^(OPPCheckoutInfo* checkoutInfo, NSError* error) {
                if (error) {
                    NSLog(@"❌ Failed to get checkout info: %@", error.localizedDescription);
                    NSLog(@"❌ Error code: %ld", (long)error.code);
                    NSLog(@"❌ Error userInfo: %@", error.userInfo);
                    [self sendPaymentStatus:@"applepay_missing_resource_path" info:@{
                        @"message": error.localizedDescription,
                        @"errorCode": @(error.code),
                        @"errorDetails": error.userInfo ?: @{}
                    }];
                    completion(PKPaymentAuthorizationStatusFailure);
                    return;
                }
                
                if (!checkoutInfo.resourcePath) {
                    NSLog(@"❌ Resource path is null in checkout info");
                    [self sendPaymentStatus:@"applepay_missing_resource_path" info:@{
                        @"message": @"Resource path is null in checkout info",
                        @"checkoutInfo": checkoutInfo ? @"present" : @"null"
                    }];
                    completion(PKPaymentAuthorizationStatusFailure);
                    return;
                }
               
                self.resourcePath = checkoutInfo.resourcePath;
                NSLog(@"✅ Apple Pay Success - Resource Path: %@", self.resourcePath);
                NSLog(@"✅ Apple Pay Success - CheckoutID: %@", self.checkoutID);
                
                // 🔥 FIX: Send success with resource path for backend verification
                [self sendPaymentStatus:kStatusApplePaySuccess info:@{
                    @"resourcePath": self.resourcePath,
                    @"checkoutID": self.checkoutID
                }];
                completion(PKPaymentAuthorizationStatusSuccess);
            }];
        }];
    } @catch (NSException *exception) {
        NSLog(@"❌ Exception in Apple Pay authorization: %@", exception.reason);
        [self sendPaymentStatus:@"exception" info:@{@"message": exception.reason}];
        completion(PKPaymentAuthorizationStatusFailure);
    }
}

- (void)paymentAuthorizationViewControllerDidFinish:(PKPaymentAuthorizationViewController *)controller {
    // If transaction did not complete, assume user cancelled
   if (!self.transaction || !self.resourcePath) {
     [self sendPaymentStatus:@"apple_pay_cancelled" info:nil];
   }
 [controller dismissViewControllerAnimated:YES completion:nil];
 // Reset transaction state
 self.transaction = nil;
 self.resourcePath = nil;
}
@end
