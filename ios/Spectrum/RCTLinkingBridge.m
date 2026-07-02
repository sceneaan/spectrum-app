#import "RCTLinkingBridge.h"
#import <React/RCTLinkingManager.h>
#import <UIKit/UIKit.h>

BOOL SpectrumOpenURL(NSURL *url) {
  return [RCTLinkingManager application:[UIApplication sharedApplication]
                                openURL:url
                                options:@{}];
}

BOOL SpectrumContinueUserActivity(NSUserActivity *userActivity) {
  return [RCTLinkingManager application:[UIApplication sharedApplication]
                   continueUserActivity:userActivity
                     restorationHandler:^(NSArray<id<UIUserActivityRestoring>> * _Nullable restorableObjects) {}];
}
