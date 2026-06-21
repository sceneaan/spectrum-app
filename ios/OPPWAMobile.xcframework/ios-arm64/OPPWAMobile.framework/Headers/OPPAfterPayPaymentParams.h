//
// Copyright (c) $$year$$ by ACI Worldwide, Inc.
// All rights reserved.
//
// This software is the confidential and proprietary information
// of ACI Worldwide Inc ("Confidential Information"). You shall
// not disclose such Confidential Information and shall use it
// only in accordance with the terms of the license agreement
// you entered with ACI Worldwide Inc.
//

#import "OPPPaymentParams.h"

/**
 Class to encapsulate all necessary transaction parameters for performing Afterpay Payments transaction.
 */
NS_ASSUME_NONNULL_BEGIN
@interface OPPAfterPayPaymentParams : OPPPaymentParams

/// @name Initialization
/// :nodoc:
- (nullable instancetype)initWithCheckoutID:(NSString *)checkoutID
                               paymentBrand:(nullable NSString *)paymentBrand
                                      error:(NSError * _Nullable __autoreleasing *)error NS_UNAVAILABLE;

+ (nullable instancetype)afterPayPaymentParamsWithCheckoutID:(NSString *)checkoutID
                                                       error:(NSError * _Nullable __autoreleasing *)error;
@end
NS_ASSUME_NONNULL_END
