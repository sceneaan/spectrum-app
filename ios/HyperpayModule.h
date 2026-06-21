#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <OPPWAMobile/OPPWAMobile.h>
#import <PassKit/PassKit.h>

@interface HyperpayModule : RCTEventEmitter <RCTBridgeModule, OPPThreeDSEventListener, PKPaymentAuthorizationViewControllerDelegate>

- (void)sendPaymentStatus:(NSString *)status;

@end
