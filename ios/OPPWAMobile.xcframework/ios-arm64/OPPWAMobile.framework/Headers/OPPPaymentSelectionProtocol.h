//
// Copyright (c) $$year$$ by ACI Worldwide, Inc.
// © Copyright ACI Worldwide, Inc. 2018,2023
// All rights reserved.
//
// This software is the confidential and proprietary information
// of ACI Worldwide Inc ("Confidential Information"). You shall
// not disclose such Confidential Information and shall use it
// only in accordance with the terms of the license agreement
// you entered with ACI Worldwide Inc.
//

#import <Foundation/Foundation.h>
#import <UIkit/UIkit.h>
#import "OPPToken.h"

NS_ASSUME_NONNULL_BEGIN

@protocol OPPPaymentSchemeSelectionActionDelegate <NSObject>
- (void)viewControllerDidLoaded;
- (void)paymentSelectionControllerDidCancel;
- (void)paymentSelectionControllerDidSelectPaymentBrand:(nonnull NSString *)paymentBrand
                                      completionHandler:(nullable void (^)(BOOL success))completionHandler;
- (void)paymentSelectionControllerDidSelectToken:(nonnull OPPToken *)token
                               completionHandler:(nullable void (^)(BOOL success))completionHandler;
@end

@protocol OPPPaymentSelectionDataSource <NSObject>
- (void)paymentSelectionControllerPaymentBrands:(nonnull NSArray<NSString *> *)paymentBrands;
- (void)paymentSelectionControllerCardTokens:(nonnull NSArray<OPPToken *> *)cardTokens;
@property (nonatomic, nullable) id<OPPPaymentSchemeSelectionActionDelegate> paymentSchemeActionDelegate;
@end

NS_ASSUME_NONNULL_END
