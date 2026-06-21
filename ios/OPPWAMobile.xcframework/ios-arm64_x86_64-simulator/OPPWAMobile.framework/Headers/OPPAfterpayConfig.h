//
//
// Copyright (c) $$year$$ by ACI Worldwide, Inc.
// © Copyright ACI Worldwide, Inc. 2018,2024
// All rights reserved.
//
// This software is the confidential and proprietary information
// of ACI Worldwide Inc ("Confidential Information"). You shall
// not disclose such Confidential Information and shall use it
// only in accordance with the terms of the license agreement
// you entered with ACI Worldwide Inc.
//
        

#import <Foundation/Foundation.h>

/**
 Class to encapsulate configuration for Afterpay payment method.
 */

NS_ASSUME_NONNULL_BEGIN

@interface OPPAfterpayConfig : NSObject

/// @name Initialization

/// :nodoc:
- (instancetype)init NS_UNAVAILABLE;

/**
 Creates an object representing Afterpay configuration.
 
 @param minimumAmount The minimum order amount.
 @param maximumAmount The maximum order amount.
 @param minimumAmount The minimum order amount.
 @param locale locale The locale for formatting of terms and conditions and currency.
 @param consumerLocale The consumer locale.
 @return Returns an object representing Afterpay configuration.
 */
- (nullable instancetype)initWithWithMinimumAmount:(NSString *)minimumAmount
                                     maximumAmount:(NSString *)maximumAmount
                                            locale:(NSLocale *)locale

                                    consumerLocale:(NSLocale *)consumerLocale;

/// @name Properties

/** The minimum order amount. */
@property (nonatomic, copy) NSString *minimumAmount;

/** The maximum order amount. */
@property (nonatomic, copy) NSString *maximumAmount;

/** Order currency. */
@property (nonatomic, copy) NSString *currencyCode;

/** Afterpay environment. */
@property (nonatomic, copy) NSString *environment;

/** The locale. */
@property (nonatomic, strong) NSLocale *locale;

/** The consumer locale. */
@property (nonatomic, strong) NSLocale *consumerLocale;

@end

NS_ASSUME_NONNULL_END
