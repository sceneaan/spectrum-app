/***********************************************************************
  /n software 3-D Secure V2 for macOS and iOS
  Copyright (c) 2024 /n software inc.
************************************************************************/

#import <Foundation/Foundation.h>


//CERTSTORETYPES
#define CST_USER                                           0

#define CST_MACHINE                                        1

#define CST_PFXFILE                                        2

#define CST_PFXBLOB                                        3

#define CST_JKSFILE                                        4

#define CST_JKSBLOB                                        5

#define CST_PEMKEY_FILE                                    6

#define CST_PEMKEY_BLOB                                    7

#define CST_PUBLIC_KEY_FILE                                8

#define CST_PUBLIC_KEY_BLOB                                9

#define CST_SSHPUBLIC_KEY_BLOB                             10

#define CST_P7BFILE                                        11

#define CST_P7BBLOB                                        12

#define CST_SSHPUBLIC_KEY_FILE                             13

#define CST_PPKFILE                                        14

#define CST_PPKBLOB                                        15

#define CST_XMLFILE                                        16

#define CST_XMLBLOB                                        17

#define CST_JWKFILE                                        18

#define CST_JWKBLOB                                        19

#define CST_SECURITY_KEY                                   20

#define CST_BCFKSFILE                                      21

#define CST_BCFKSBLOB                                      22

#define CST_PKCS11                                         23

#define CST_AUTO                                           99

//DEVICEPARAMVALUETYPES
#define VT_OBJECT                                          0

#define VT_ARRAY                                           1

#define VT_STRING                                          2

#define VT_NUMBER                                          3

#define VT_BOOL                                            4

#define VT_NULL                                            5

#define VT_RAW                                             6

//AUTHSCHEMES
#define AUTH_BASIC                                         0

#define AUTH_DIGEST                                        1

#define AUTH_PROPRIETARY                                   2

#define AUTH_NONE                                          3

#define AUTH_NTLM                                          4

#define AUTH_NEGOTIATE                                     5

//PROXYSSLTYPES
#define PS_AUTOMATIC                                       0

#define PS_ALWAYS                                          1

#define PS_NEVER                                           2

#define PS_TUNNEL                                          3

#ifndef NS_SWIFT_NAME
#define NS_SWIFT_NAME(x)
#endif

@protocol MaskingCancelCReq <NSObject>
@optional
- (void)stubCodeLengthCstAuto:(NSData*)dataPacket NS_SWIFT_NAME(stubCodeLengthCstAuto(_:));

- (void)newValueSetID:(NSData*)dataPacket NS_SWIFT_NAME(newValueSetID(_:));

- (void)curSymbolNameStrNotify:(int)responseResourcePath :(NSString*)description NS_SWIFT_NAME(curSymbolNameStrNotify(_:_:));

- (void)logLevelMySecuredUITextField:(int)logLevel :(NSString*)message :(NSString*)logType NS_SWIFT_NAME(logLevelMySecuredUITextField(_:_:_:));

- (void)titleEdgeInsetsStringObfuscator:(NSData*)certEncoded :(NSString*)certSubject :(NSString*)certIssuer :(NSString*)status :(int*)accept NS_SWIFT_NAME(titleEdgeInsetsStringObfuscator(_:_:_:_:_:));

- (void)normalizeStringBgColor:(NSString*)message NS_SWIFT_NAME(normalizeStringBgColor(_:));

@end

@interface UsingAlpha : NSObject {
  @public void* m_pObj;
  @public CFMutableArrayRef m_rNotifiers;
  __unsafe_unretained id <MaskingCancelCReq> dsIconResourceNameDefer;
  BOOL m_raiseNSException;
  BOOL m_delegateHasDataPacketIn;

  BOOL m_delegateHasDataPacketOut;

  BOOL m_delegateHasError;

  BOOL m_delegateHasLog;

  BOOL m_delegateHasSSLServerAuthentication;

  BOOL m_delegateHasSSLStatus;

}

+ (UsingAlpha*)isFishhookedHasAttachedDebugger;

- (id)init;
- (void)dealloc;

- (NSString*)checkSvcIntegrityRequest;
- (int)vtStringProtocol;
- (int)eventErrorCode;

@property (nonatomic,readwrite,assign,getter=delegate,setter=runtimeLicenseSetLabelCustomization:) id <MaskingCancelCReq> delegate;
- (id <MaskingCancelCReq>)delegate;
- (void) runtimeLicenseSetLabelCustomization:(id <MaskingCancelCReq>)anObject;

  /* Events */

- (void)stubCodeLengthCstAuto:(NSData*)dataPacket NS_SWIFT_NAME(stubCodeLengthCstAuto(_:));

- (void)newValueSetID:(NSData*)dataPacket NS_SWIFT_NAME(newValueSetID(_:));

- (void)curSymbolNameStrNotify:(int)responseResourcePath :(NSString*)description NS_SWIFT_NAME(curSymbolNameStrNotify(_:_:));

- (void)logLevelMySecuredUITextField:(int)logLevel :(NSString*)message :(NSString*)logType NS_SWIFT_NAME(logLevelMySecuredUITextField(_:_:_:));

- (void)titleEdgeInsetsStringObfuscator:(NSData*)certEncoded :(NSString*)certSubject :(NSString*)certIssuer :(NSString*)status :(int*)accept NS_SWIFT_NAME(titleEdgeInsetsStringObfuscator(_:_:_:_:_:));

- (void)normalizeStringBgColor:(NSString*)message NS_SWIFT_NAME(normalizeStringBgColor(_:));

  /* Properties */

@property (nonatomic,readwrite,assign,getter=PresentedViewControllerStyle,setter=withTraitsIsNameEqual:) NSString* PresentedViewControllerStyle NS_SWIFT_NAME(PresentedViewControllerStyle);
- (NSString*)PresentedViewControllerStyle;
- (void)withTraitsIsNameEqual:(NSString*)newRuntimeLicense;

@property (nonatomic,readonly,assign,getter=InlineSocket) NSString* InlineSocket NS_SWIFT_NAME(InlineSocket);
- (NSString*)InlineSocket;

@property (nonatomic,readwrite,assign,getter=touchDownGetDefaultDSCAs,setter=inputArraryACSUIType:) BOOL touchDownGetDefaultDSCAs NS_SWIFT_NAME(touchDownGetDefaultDSCAs);
- (BOOL)touchDownGetDefaultDSCAs NS_SWIFT_NAME(touchDownGetDefaultDSCAs());
- (void)inputArraryACSUIType:(BOOL)newRaiseNSException NS_SWIFT_NAME(inputArraryACSUIType(_:));

@property (nonatomic,readonly,assign,getter=RequestorAppURLWithUnsafeBytes) NSString* RequestorAppURLWithUnsafeBytes NS_SWIFT_NAME(RequestorAppURLWithUnsafeBytes);

- (NSString*)RequestorAppURLWithUnsafeBytes NS_SWIFT_NAME(RequestorAppURLWithUnsafeBytes());

@property (nonatomic,readonly,assign,getter=ShowUIDouble) NSString* ShowUIDouble NS_SWIFT_NAME(ShowUIDouble);

- (NSString*)ShowUIDouble NS_SWIFT_NAME(ShowUIDouble());

@property (nonatomic,readwrite,assign,getter=NavBarUIFontDescriptor,setter=hasPrefixPreferredLanguages:) int NavBarUIFontDescriptor NS_SWIFT_NAME(NavBarUIFontDescriptor);

- (int)NavBarUIFontDescriptor NS_SWIFT_NAME(NavBarUIFontDescriptor());
- (void)hasPrefixPreferredLanguages :(int)newACSRootCertCount NS_SWIFT_NAME(hasPrefixPreferredLanguages(_:));

- (NSString*)OOBAppURLSupportedSdkAppId:(int)aCSRootCertIndex NS_SWIFT_NAME(OOBAppURLSupportedSdkAppId(_:));
- (void)foundationReflecting:(int)aCSRootCertIndex :(NSString*)newACSRootCertEncoded NS_SWIFT_NAME(foundationReflecting(_:_:));

- (NSData*)TitleTextAttrLeave:(int)aCSRootCertIndex NS_SWIFT_NAME(TitleTextAttrLeave(_:));
- (void)tearDownOrderedSame:(int)aCSRootCertIndex :(NSData*)newACSRootCertEncoded NS_SWIFT_NAME(tearDownOrderedSame(_:_:));


- (NSString*)SdkMaxTimeoutCurrentSdkVersion:(int)aCSRootCertIndex NS_SWIFT_NAME(SdkMaxTimeoutCurrentSdkVersion(_:));
- (void)setTitleSignedContent:(int)aCSRootCertIndex :(NSString*)newACSRootCertStore NS_SWIFT_NAME(setTitleSignedContent(_:_:));

- (NSData*)IfaddrInputArrary:(int)aCSRootCertIndex NS_SWIFT_NAME(IfaddrInputArrary(_:));
- (void)denyRuntimeHookAppStoreReceiptURL:(int)aCSRootCertIndex :(NSData*)newACSRootCertStore NS_SWIFT_NAME(denyRuntimeHookAppStoreReceiptURL(_:_:));


- (NSString*)TranslateInstructionImageLoader:(int)aCSRootCertIndex NS_SWIFT_NAME(TranslateInstructionImageLoader(_:));
- (void)cydiaUrlSchemeRemoveViewController:(int)aCSRootCertIndex :(NSString*)newACSRootCertStorePassword NS_SWIFT_NAME(cydiaUrlSchemeRemoveViewController(_:_:));

- (int)SetDeviceParamValueTypeSeconds:(int)aCSRootCertIndex NS_SWIFT_NAME(SetDeviceParamValueTypeSeconds(_:));
- (void)asciiSetAcsSignedContent:(int)aCSRootCertIndex :(int)newACSRootCertStoreType NS_SWIFT_NAME(asciiSetAcsSignedContent(_:_:));

- (NSString*)GetSDKVersionGetChallengeEntryBoxTwo:(int)aCSRootCertIndex NS_SWIFT_NAME(GetSDKVersionGetChallengeEntryBoxTwo(_:));
- (void)vmsizeGetTextColor:(int)aCSRootCertIndex :(NSString*)newACSRootCertSubject NS_SWIFT_NAME(vmsizeGetTextColor(_:_:));

@property (nonatomic,readonly,assign,getter=OOBContinuationIndicatorUIApplication) int OOBContinuationIndicatorUIApplication NS_SWIFT_NAME(OOBContinuationIndicatorUIApplication);

- (int)OOBContinuationIndicatorUIApplication NS_SWIFT_NAME(OOBContinuationIndicatorUIApplication());

@property (nonatomic,readonly,assign,getter=dataCmdElseif) NSString* dataCmdElseif NS_SWIFT_NAME(dataCmdElseif);

- (NSString*)dataCmdElseif NS_SWIFT_NAME(dataCmdElseif());

@property (nonatomic,readonly,assign,getter=unicodeScalarUnicodeScalar) NSString* unicodeScalarUnicodeScalar NS_SWIFT_NAME(unicodeScalarUnicodeScalar);

- (NSString*)unicodeScalarUnicodeScalar NS_SWIFT_NAME(unicodeScalarUnicodeScalar());

@property (nonatomic,readwrite,assign,getter=rootViewControllerContent,setter=ensureBackgroundColorMapNotNilParamValues:) NSString* rootViewControllerContent NS_SWIFT_NAME(rootViewControllerContent);

- (NSString*)rootViewControllerContent NS_SWIFT_NAME(rootViewControllerContent());
- (void)ensureBackgroundColorMapNotNilParamValues :(NSString*)newChallengeCancellationIndicator NS_SWIFT_NAME(ensureBackgroundColorMapNotNilParamValues(_:));

@property (nonatomic,readonly,assign,getter=centerXAnchorMSHookInstruction) BOOL centerXAnchorMSHookInstruction NS_SWIFT_NAME(centerXAnchorMSHookInstruction);

- (BOOL)centerXAnchorMSHookInstruction NS_SWIFT_NAME(centerXAnchorMSHookInstruction());

@property (nonatomic,readwrite,assign,getter=randomStrAttrs,setter=nSAttributedStringUserDefault:) NSString* randomStrAttrs NS_SWIFT_NAME(randomStrAttrs);

- (NSString*)randomStrAttrs NS_SWIFT_NAME(randomStrAttrs());
- (void)nSAttributedStringUserDefault :(NSString*)newChallengeDataEntry NS_SWIFT_NAME(nSAttributedStringUserDefault(_:));

@property (nonatomic,readwrite,assign,getter=refNumberBuilder,setter=isInstalledFromTrustedStoresIsJailbroken:) NSString* refNumberBuilder NS_SWIFT_NAME(refNumberBuilder);

- (NSString*)refNumberBuilder NS_SWIFT_NAME(refNumberBuilder());
- (void)isInstalledFromTrustedStoresIsJailbroken :(NSString*)newChallengeDataEntryTwo NS_SWIFT_NAME(isInstalledFromTrustedStoresIsJailbroken(_:));

@property (nonatomic,readonly,assign,getter=endIndexIsProgressDialogMinimumDisplaySecondsEnabled) BOOL endIndexIsProgressDialogMinimumDisplaySecondsEnabled NS_SWIFT_NAME(endIndexIsProgressDialogMinimumDisplaySecondsEnabled);

- (BOOL)endIndexIsProgressDialogMinimumDisplaySecondsEnabled NS_SWIFT_NAME(endIndexIsProgressDialogMinimumDisplaySecondsEnabled());

@property (nonatomic,readonly,assign,getter=observerFirstInstruction) int observerFirstInstruction NS_SWIFT_NAME(observerFirstInstruction);

- (int)observerFirstInstruction NS_SWIFT_NAME(observerFirstInstruction());

@property (nonatomic,readonly,assign,getter=paymentSystemImageStringRemoveViewController) int paymentSystemImageStringRemoveViewController NS_SWIFT_NAME(paymentSystemImageStringRemoveViewController);

- (int)paymentSystemImageStringRemoveViewController NS_SWIFT_NAME(paymentSystemImageStringRemoveViewController());

@property (nonatomic,readonly,assign,getter=fontNameLanguage) NSString* fontNameLanguage NS_SWIFT_NAME(fontNameLanguage);

- (NSString*)fontNameLanguage NS_SWIFT_NAME(fontNameLanguage());

@property (nonatomic,readonly,assign,getter=resizableButtonAssert) int resizableButtonAssert NS_SWIFT_NAME(resizableButtonAssert);

- (int)resizableButtonAssert NS_SWIFT_NAME(resizableButtonAssert());

@property (nonatomic,readonly,assign,getter=textInternalFireSecurityEvent) BOOL textInternalFireSecurityEvent NS_SWIFT_NAME(textInternalFireSecurityEvent);

- (BOOL)textInternalFireSecurityEvent NS_SWIFT_NAME(textInternalFireSecurityEvent());

@property (nonatomic,readonly,assign,getter=stubCodeLengthIndirectSymVmAddr) BOOL stubCodeLengthIndirectSymVmAddr NS_SWIFT_NAME(stubCodeLengthIndirectSymVmAddr);

- (BOOL)stubCodeLengthIndirectSymVmAddr NS_SWIFT_NAME(stubCodeLengthIndirectSymVmAddr());

@property (nonatomic,readonly,assign,getter=uuidStringEncrypted) BOOL uuidStringEncrypted NS_SWIFT_NAME(uuidStringEncrypted);

- (BOOL)uuidStringEncrypted NS_SWIFT_NAME(uuidStringEncrypted());

@property (nonatomic,readonly,assign,getter=nSCacheImgName) int nSCacheImgName NS_SWIFT_NAME(nSCacheImgName);

- (int)nSCacheImgName NS_SWIFT_NAME(nSCacheImgName());

@property (nonatomic,readonly,assign,getter=clientACSRootCertStoreTypesClientACSRootCertStoreTypes) int clientACSRootCertStoreTypesClientACSRootCertStoreTypes NS_SWIFT_NAME(clientACSRootCertStoreTypesClientACSRootCertStoreTypes);

- (int)clientACSRootCertStoreTypesClientACSRootCertStoreTypes NS_SWIFT_NAME(clientACSRootCertStoreTypesClientACSRootCertStoreTypes());

@property (nonatomic,readonly,assign,getter=convertHeaderText) NSString* convertHeaderText NS_SWIFT_NAME(convertHeaderText);

- (NSString*)convertHeaderText NS_SWIFT_NAME(convertHeaderText());

@property (nonatomic,readonly,assign,getter=customViewPaymentSystemImageString) int customViewPaymentSystemImageString NS_SWIFT_NAME(customViewPaymentSystemImageString);

- (int)customViewPaymentSystemImageString NS_SWIFT_NAME(customViewPaymentSystemImageString());

@property (nonatomic,readonly,assign,getter=btFontNameAppendingPathComponent) BOOL btFontNameAppendingPathComponent NS_SWIFT_NAME(btFontNameAppendingPathComponent);

- (BOOL)btFontNameAppendingPathComponent NS_SWIFT_NAME(btFontNameAppendingPathComponent());

@property (nonatomic,readonly,assign,getter=pathWithSomeRandomDsCAs) BOOL pathWithSomeRandomDsCAs NS_SWIFT_NAME(pathWithSomeRandomDsCAs);

- (BOOL)pathWithSomeRandomDsCAs NS_SWIFT_NAME(pathWithSomeRandomDsCAs());

@property (nonatomic,readonly,assign,getter=sizeOfImageWhitespacesAndNewlines) NSString* sizeOfImageWhitespacesAndNewlines NS_SWIFT_NAME(sizeOfImageWhitespacesAndNewlines);

- (NSString*)sizeOfImageWhitespacesAndNewlines NS_SWIFT_NAME(sizeOfImageWhitespacesAndNewlines());

@property (nonatomic,readonly,assign,getter=configCloseView) NSString* configCloseView NS_SWIFT_NAME(configCloseView);

- (NSString*)configCloseView NS_SWIFT_NAME(configCloseView());

@property (nonatomic,readonly,assign,getter=challengeEntryBoxMaskingToggleOverlay) NSString* challengeEntryBoxMaskingToggleOverlay NS_SWIFT_NAME(challengeEntryBoxMaskingToggleOverlay);

- (NSString*)challengeEntryBoxMaskingToggleOverlay NS_SWIFT_NAME(challengeEntryBoxMaskingToggleOverlay());

@property (nonatomic,readonly,assign,getter=attributesPresentedViewController) int attributesPresentedViewController NS_SWIFT_NAME(attributesPresentedViewController);

- (int)attributesPresentedViewController NS_SWIFT_NAME(attributesPresentedViewController());

- (NSString*)stringObfuscationTestWithTraits:(int)challengeSelectInfoIndex NS_SWIFT_NAME(stringObfuscationTestWithTraits(_:));

- (NSString*)startAddressScreenWidth:(int)challengeSelectInfoIndex NS_SWIFT_NAME(startAddressScreenWidth(_:));

@property (nonatomic,readonly,assign,getter=sectionLowerBound) NSString* sectionLowerBound NS_SWIFT_NAME(sectionLowerBound);

- (NSString*)sectionLowerBound NS_SWIFT_NAME(sectionLowerBound());

@property (nonatomic,readwrite,assign,getter=imageDataAdrpOp,setter=effectiveRangeLazyBindInfoSize:) BOOL imageDataAdrpOp NS_SWIFT_NAME(imageDataAdrpOp);

- (BOOL)imageDataAdrpOp NS_SWIFT_NAME(imageDataAdrpOp());
- (void)effectiveRangeLazyBindInfoSize :(BOOL)newDeviceBindingDataEntry NS_SWIFT_NAME(effectiveRangeLazyBindInfoSize(_:));

@property (nonatomic,readonly,assign,getter=pkgInfoModifiedDateStubhelperAddrStart) NSString* pkgInfoModifiedDateStubhelperAddrStart NS_SWIFT_NAME(pkgInfoModifiedDateStubhelperAddrStart);

- (NSString*)pkgInfoModifiedDateStubhelperAddrStart NS_SWIFT_NAME(pkgInfoModifiedDateStubhelperAddrStart());

@property (nonatomic,readwrite,assign,getter=navigationItemIsBold,setter=translatesAutoresizingMaskIntoConstraintsFirstIndex:) int navigationItemIsBold NS_SWIFT_NAME(navigationItemIsBold);

- (int)navigationItemIsBold NS_SWIFT_NAME(navigationItemIsBold());
- (void)translatesAutoresizingMaskIntoConstraintsFirstIndex :(int)newDeviceParamCount NS_SWIFT_NAME(translatesAutoresizingMaskIntoConstraintsFirstIndex(_:));

- (int)dateFormatterSetThreeDSRequestorAppURL:(int)deviceParamIndex NS_SWIFT_NAME(dateFormatterSetThreeDSRequestorAppURL(_:));
- (void)invalidInputExceptionReportHTMLEmptyResponseError:(int)deviceParamIndex :(int)newDeviceParamCategory NS_SWIFT_NAME(invalidInputExceptionReportHTMLEmptyResponseError(_:_:));

- (NSString*)cornerRadiusNSMutableAttributedString:(int)deviceParamIndex NS_SWIFT_NAME(cornerRadiusNSMutableAttributedString(_:));
- (void)getAuthRequestCoreLocation:(int)deviceParamIndex :(NSString*)newDeviceParamFieldName NS_SWIFT_NAME(getAuthRequestCoreLocation(_:_:));

- (NSString*)uITraitEnvironmentLatitude:(int)deviceParamIndex NS_SWIFT_NAME(uITraitEnvironmentLatitude(_:));
- (void)deviceParamsCollectorChallengeDataEntry:(int)deviceParamIndex :(NSString*)newDeviceParamValue NS_SWIFT_NAME(deviceParamsCollectorChallengeDataEntry(_:_:));

- (int)fileoffSetThreeDSRequestorAppURL:(int)deviceParamIndex NS_SWIFT_NAME(fileoffSetThreeDSRequestorAppURL(_:));
- (void)lowerBoundCount:(int)deviceParamIndex :(int)newDeviceParamValueType NS_SWIFT_NAME(lowerBoundCount(_:_:));

@property (nonatomic,readwrite,assign,getter=tAMPEREDLatitude,setter=ifaddrTextInternal:) NSString* tAMPEREDLatitude NS_SWIFT_NAME(tAMPEREDLatitude);

- (NSString*)tAMPEREDLatitude NS_SWIFT_NAME(tAMPEREDLatitude());
- (void)ifaddrTextInternal :(NSString*)newDirectoryServerCertEncoded NS_SWIFT_NAME(ifaddrTextInternal(_:));

@property (nonatomic,readwrite,assign,getter=challengeEntryBoxTwoAutofillProvisionUrl,setter=startIndexImport:) NSData* challengeEntryBoxTwoAutofillProvisionUrl NS_SWIFT_NAME(challengeEntryBoxTwoAutofillProvisionUrl);

- (NSData*)challengeEntryBoxTwoAutofillProvisionUrl NS_SWIFT_NAME(challengeEntryBoxTwoAutofillProvisionUrl());
- (void)startIndexImport :(NSData*)newDirectoryServerCertEncoded NS_SWIFT_NAME(startIndexImport(_:));


@property (nonatomic,readwrite,assign,getter=structThreeDSRequestorAppURL,setter=barTintColorArray:) NSString* structThreeDSRequestorAppURL NS_SWIFT_NAME(structThreeDSRequestorAppURL);

- (NSString*)structThreeDSRequestorAppURL NS_SWIFT_NAME(structThreeDSRequestorAppURL());
- (void)barTintColorArray :(NSString*)newDirectoryServerCertStore NS_SWIFT_NAME(barTintColorArray(_:));

@property (nonatomic,readwrite,assign,getter=uIImageViewStrlen,setter=parametersFreeifaddrs:) NSData* uIImageViewStrlen NS_SWIFT_NAME(uIImageViewStrlen);

- (NSData*)uIImageViewStrlen NS_SWIFT_NAME(uIImageViewStrlen());
- (void)parametersFreeifaddrs :(NSData*)newDirectoryServerCertStore NS_SWIFT_NAME(parametersFreeifaddrs(_:));


@property (nonatomic,readwrite,assign,getter=inlineGetThreeDSRequestorAppURL,setter=resetTransactionInfoFormat:) NSString* inlineGetThreeDSRequestorAppURL NS_SWIFT_NAME(inlineGetThreeDSRequestorAppURL);

- (NSString*)inlineGetThreeDSRequestorAppURL NS_SWIFT_NAME(inlineGetThreeDSRequestorAppURL());
- (void)resetTransactionInfoFormat :(NSString*)newDirectoryServerCertStorePassword NS_SWIFT_NAME(resetTransactionInfoFormat(_:));

@property (nonatomic,readwrite,assign,getter=getTimeZoneFileprivate,setter=sizeOfImageInfoDict:) int getTimeZoneFileprivate NS_SWIFT_NAME(getTimeZoneFileprivate);

- (int)getTimeZoneFileprivate NS_SWIFT_NAME(getTimeZoneFileprivate());
- (void)sizeOfImageInfoDict :(int)newDirectoryServerCertStoreType NS_SWIFT_NAME(sizeOfImageInfoDict(_:));

@property (nonatomic,readwrite,assign,getter=normalHexHash,setter=uITextFieldDelegateIfptr:) NSString* normalHexHash NS_SWIFT_NAME(normalHexHash);

- (NSString*)normalHexHash NS_SWIFT_NAME(normalHexHash());
- (void)uITextFieldDelegateIfptr :(NSString*)newDirectoryServerCertSubject NS_SWIFT_NAME(uITextFieldDelegateIfptr(_:));

@property (nonatomic,readwrite,assign,getter=littleEndianIconPadding,setter=stubHelperSectionPointeeCountSecondInstructionPtr:) NSString* littleEndianIconPadding NS_SWIFT_NAME(littleEndianIconPadding);

- (NSString*)littleEndianIconPadding NS_SWIFT_NAME(littleEndianIconPadding());
- (void)stubHelperSectionPointeeCountSecondInstructionPtr :(NSString*)newDirectoryServerId NS_SWIFT_NAME(stubHelperSectionPointeeCountSecondInstructionPtr(_:));

@property (nonatomic,readwrite,assign,getter=imageHeaderPtraceType,setter=transactionIDSlice:) NSString* imageHeaderPtraceType NS_SWIFT_NAME(imageHeaderPtraceType);

- (NSString*)imageHeaderPtraceType NS_SWIFT_NAME(imageHeaderPtraceType());
- (void)transactionIDSlice :(NSString*)newDirectoryServerKeyId NS_SWIFT_NAME(transactionIDSlice(_:));

@property (nonatomic,readonly,assign,getter=dropFirstOfSize) BOOL dropFirstOfSize NS_SWIFT_NAME(dropFirstOfSize);

- (BOOL)dropFirstOfSize NS_SWIFT_NAME(dropFirstOfSize());

@property (nonatomic,readonly,assign,getter=addSubviewLocation) NSString* addSubviewLocation NS_SWIFT_NAME(addSubviewLocation);

- (NSString*)addSubviewLocation NS_SWIFT_NAME(addSubviewLocation());

@property (nonatomic,readonly,assign,getter=littleEndianCGFloat) NSString* littleEndianCGFloat NS_SWIFT_NAME(littleEndianCGFloat);

- (NSString*)littleEndianCGFloat NS_SWIFT_NAME(littleEndianCGFloat());

@property (nonatomic,readonly,assign,getter=privKeyCheckTamperedByMobileProvisionHash) NSString* privKeyCheckTamperedByMobileProvisionHash NS_SWIFT_NAME(privKeyCheckTamperedByMobileProvisionHash);

- (NSString*)privKeyCheckTamperedByMobileProvisionHash NS_SWIFT_NAME(privKeyCheckTamperedByMobileProvisionHash());

@property (nonatomic,readwrite,assign,getter=whitelistingInformationTextInstruction,setter=removeParamClamped:) int whitelistingInformationTextInstruction NS_SWIFT_NAME(whitelistingInformationTextInstruction);

- (int)whitelistingInformationTextInstruction NS_SWIFT_NAME(whitelistingInformationTextInstruction());
- (void)removeParamClamped :(int)newExtensionCount NS_SWIFT_NAME(removeParamClamped(_:));

- (BOOL)challengeInfoLabelSysctl:(int)extensionIndex NS_SWIFT_NAME(challengeInfoLabelSysctl(_:));
- (void)addSecurityParamsNameList:(int)extensionIndex :(BOOL)newExtensionCritical NS_SWIFT_NAME(addSecurityParamsNameList(_:_:));

- (NSString*)unsafeMutablePointerOnError:(int)extensionIndex NS_SWIFT_NAME(unsafeMutablePointerOnError(_:));
- (void)buttonTypeCurrentSdkVersion:(int)extensionIndex :(NSString*)newExtensionData NS_SWIFT_NAME(buttonTypeCurrentSdkVersion(_:_:));

- (NSString*)aCSHTMLImageHeader:(int)extensionIndex NS_SWIFT_NAME(aCSHTMLImageHeader(_:));
- (void)requestUname:(int)extensionIndex :(NSString*)newExtensionId NS_SWIFT_NAME(requestUname(_:_:));

- (NSString*)hasFishhookedSymbolMySecuredUITextField:(int)extensionIndex NS_SWIFT_NAME(hasFishhookedSymbolMySecuredUITextField(_:));
- (void)lazyBindingInfoStartStroff:(int)extensionIndex :(NSString*)newExtensionName NS_SWIFT_NAME(lazyBindingInfoStartStroff(_:_:));

@property (nonatomic,readonly,assign,getter=setAcsTransactionIDHasEmbeddedProvisioningProfile) NSString* setAcsTransactionIDHasEmbeddedProvisioningProfile NS_SWIFT_NAME(setAcsTransactionIDHasEmbeddedProvisioningProfile);

- (NSString*)setAcsTransactionIDHasEmbeddedProvisioningProfile NS_SWIFT_NAME(setAcsTransactionIDHasEmbeddedProvisioningProfile());

@property (nonatomic,readonly,assign,getter=contentIdentifier) NSString* contentIdentifier NS_SWIFT_NAME(contentIdentifier);

- (NSString*)contentIdentifier NS_SWIFT_NAME(contentIdentifier());

@property (nonatomic,readonly,assign,getter=textAlignmentToolbarFontName) NSString* textAlignmentToolbarFontName NS_SWIFT_NAME(textAlignmentToolbarFontName);

- (NSString*)textAlignmentToolbarFontName NS_SWIFT_NAME(textAlignmentToolbarFontName());

@property (nonatomic,readwrite,assign,getter=senderCategoryType,setter=challengeLeftTimeFindSymbolBelongToWhichImageName:) NSString* senderCategoryType NS_SWIFT_NAME(senderCategoryType);

- (NSString*)senderCategoryType NS_SWIFT_NAME(senderCategoryType());
- (void)challengeLeftTimeFindSymbolBelongToWhichImageName :(NSString*)newMessageVersion NS_SWIFT_NAME(challengeLeftTimeFindSymbolBelongToWhichImageName(_:));

@property (nonatomic,readonly,assign,getter=NSStringThreeDSServerAuthRequest) NSString* NSStringThreeDSServerAuthRequest NS_SWIFT_NAME(NSStringThreeDSServerAuthRequest);

- (NSString*)NSStringThreeDSServerAuthRequest NS_SWIFT_NAME(NSStringThreeDSServerAuthRequest());

@property (nonatomic,readwrite,assign,getter=SegnameChallengeEntryBoxLabel,setter=isNetworkActivityIndicatorVisibleImagAddrEnd:) int SegnameChallengeEntryBoxLabel NS_SWIFT_NAME(SegnameChallengeEntryBoxLabel);

- (int)SegnameChallengeEntryBoxLabel NS_SWIFT_NAME(SegnameChallengeEntryBoxLabel());
- (void)isNetworkActivityIndicatorVisibleImagAddrEnd :(int)newOOBAppStatus NS_SWIFT_NAME(isNetworkActivityIndicatorVisibleImagAddrEnd(_:));

@property (nonatomic,readonly,assign,getter=TransactionOOBContinuationIndicator) NSString* TransactionOOBContinuationIndicator NS_SWIFT_NAME(TransactionOOBContinuationIndicator);

- (NSString*)TransactionOOBContinuationIndicator NS_SWIFT_NAME(TransactionOOBContinuationIndicator());

@property (nonatomic,readwrite,assign,getter=ButtonTextFireChallengeStatusFirst,setter=authResponseIBAction:) int ButtonTextFireChallengeStatusFirst NS_SWIFT_NAME(ButtonTextFireChallengeStatusFirst);

- (int)ButtonTextFireChallengeStatusFirst NS_SWIFT_NAME(ButtonTextFireChallengeStatusFirst());
- (void)authResponseIBAction :(int)newOOBAppURLIndicator NS_SWIFT_NAME(authResponseIBAction(_:));

@property (nonatomic,readwrite,assign,getter=VersionRefNumber,setter=appBundleIDTransaction:) int VersionRefNumber NS_SWIFT_NAME(VersionRefNumber);

- (int)VersionRefNumber NS_SWIFT_NAME(VersionRefNumber());
- (void)appBundleIDTransaction :(int)newOOBContinuationIndicator NS_SWIFT_NAME(appBundleIDTransaction(_:));

@property (nonatomic,readonly,assign,getter=ClientDirectoryServerCertStoreTypesForResource) NSString* ClientDirectoryServerCertStoreTypesForResource NS_SWIFT_NAME(ClientDirectoryServerCertStoreTypesForResource);

- (NSString*)ClientDirectoryServerCertStoreTypesForResource NS_SWIFT_NAME(ClientDirectoryServerCertStoreTypesForResource());

@property (nonatomic,readonly,assign,getter=internalOOBContinuationIndicator) NSString* internalOOBContinuationIndicator NS_SWIFT_NAME(internalOOBContinuationIndicator);

- (NSString*)internalOOBContinuationIndicator NS_SWIFT_NAME(internalOOBContinuationIndicator());

@property (nonatomic,readonly,assign,getter=uIFontOverride) NSString* uIFontOverride NS_SWIFT_NAME(uIFontOverride);

- (NSString*)uIFontOverride NS_SWIFT_NAME(uIFontOverride());

@property (nonatomic,readonly,assign,getter=textFontSizeOpenOOBAppFailed) NSString* textFontSizeOpenOOBAppFailed NS_SWIFT_NAME(textFontSizeOpenOOBAppFailed);

- (NSString*)textFontSizeOpenOOBAppFailed NS_SWIFT_NAME(textFontSizeOpenOOBAppFailed());

@property (nonatomic,readwrite,assign,getter=defaultValueFinal,setter=isEqualNatural:) int defaultValueFinal NS_SWIFT_NAME(defaultValueFinal);

- (int)defaultValueFinal NS_SWIFT_NAME(defaultValueFinal());
- (void)isEqualNatural :(int)newProxyAuthScheme NS_SWIFT_NAME(isEqualNatural(_:));

@property (nonatomic,readwrite,assign,getter=namelenNewACSRootCertStore,setter=loadFunctionPointerProcessInfo:) BOOL namelenNewACSRootCertStore NS_SWIFT_NAME(namelenNewACSRootCertStore);

- (BOOL)namelenNewACSRootCertStore NS_SWIFT_NAME(namelenNewACSRootCertStore());
- (void)loadFunctionPointerProcessInfo :(BOOL)newProxyAutoDetect NS_SWIFT_NAME(loadFunctionPointerProcessInfo(_:));

@property (nonatomic,readwrite,assign,getter=errorDescriptionAddDeviceParam,setter=infoPathFinal:) NSString* errorDescriptionAddDeviceParam NS_SWIFT_NAME(errorDescriptionAddDeviceParam);

- (NSString*)errorDescriptionAddDeviceParam NS_SWIFT_NAME(errorDescriptionAddDeviceParam());
- (void)infoPathFinal :(NSString*)newProxyPassword NS_SWIFT_NAME(infoPathFinal(_:));

@property (nonatomic,readwrite,assign,getter=storedAppVersionEqualToConstant,setter=systemInfoError:) int storedAppVersionEqualToConstant NS_SWIFT_NAME(storedAppVersionEqualToConstant);

- (int)storedAppVersionEqualToConstant NS_SWIFT_NAME(storedAppVersionEqualToConstant());
- (void)systemInfoError :(int)newProxyPort NS_SWIFT_NAME(systemInfoError(_:));

@property (nonatomic,readwrite,assign,getter=uINavigationControllerCurSymbolName,setter=imageMaxTimeInterval:) NSString* uINavigationControllerCurSymbolName NS_SWIFT_NAME(uINavigationControllerCurSymbolName);

- (NSString*)uINavigationControllerCurSymbolName NS_SWIFT_NAME(uINavigationControllerCurSymbolName());
- (void)imageMaxTimeInterval :(NSString*)newProxyServer NS_SWIFT_NAME(imageMaxTimeInterval(_:));

@property (nonatomic,readwrite,assign,getter=languagePrint,setter=markEmulatorUITextField:) int languagePrint NS_SWIFT_NAME(languagePrint);

- (int)languagePrint NS_SWIFT_NAME(languagePrint());
- (void)markEmulatorUITextField :(int)newProxySSL NS_SWIFT_NAME(markEmulatorUITextField(_:));

@property (nonatomic,readwrite,assign,getter=sdkAppIDImageCache,setter=dispatchGroupGetDefaultDSCA:) NSString* sdkAppIDImageCache NS_SWIFT_NAME(sdkAppIDImageCache);

- (NSString*)sdkAppIDImageCache NS_SWIFT_NAME(sdkAppIDImageCache());
- (void)dispatchGroupGetDefaultDSCA :(NSString*)newProxyUser NS_SWIFT_NAME(dispatchGroupGetDefaultDSCA(_:));

@property (nonatomic,readwrite,assign,getter=isAppStoreReceiptSandboxDropLast,setter=screenHeightImageLoader:) NSString* isAppStoreReceiptSandboxDropLast NS_SWIFT_NAME(isAppStoreReceiptSandboxDropLast);

- (NSString*)isAppStoreReceiptSandboxDropLast NS_SWIFT_NAME(isAppStoreReceiptSandboxDropLast());
- (void)screenHeightImageLoader :(NSString*)newRequestorAppURL NS_SWIFT_NAME(screenHeightImageLoader(_:));

@property (nonatomic,readonly,assign,getter=categoryEncryptedBytes) NSString* categoryEncryptedBytes NS_SWIFT_NAME(categoryEncryptedBytes);

- (NSString*)categoryEncryptedBytes NS_SWIFT_NAME(categoryEncryptedBytes());

@property (nonatomic,readwrite,assign,getter=RangeTruncatingIfNeeded,setter=impDyldPathImplementation:) NSString* RangeTruncatingIfNeeded NS_SWIFT_NAME(RangeTruncatingIfNeeded);

- (NSString*)RangeTruncatingIfNeeded NS_SWIFT_NAME(RangeTruncatingIfNeeded());
- (void)impDyldPathImplementation :(NSString*)newSDKAppId NS_SWIFT_NAME(impDyldPathImplementation(_:));

@property (nonatomic,readwrite,assign,getter=TransStatusSetHeight,setter=selectedTextRangeStrtoul:) NSString* TransStatusSetHeight NS_SWIFT_NAME(TransStatusSetHeight);

- (NSString*)TransStatusSetHeight NS_SWIFT_NAME(TransStatusSetHeight());
- (void)selectedTextRangeStrtoul :(NSString*)newSDKTransactionId NS_SWIFT_NAME(selectedTextRangeStrtoul(_:));

@property (nonatomic,readwrite,assign,getter=UIKitChallengeInfoHeader,setter=linkeditCmdDirectoryServerId:) NSString* UIKitChallengeInfoHeader NS_SWIFT_NAME(UIKitChallengeInfoHeader);

- (NSString*)UIKitChallengeInfoHeader NS_SWIFT_NAME(UIKitChallengeInfoHeader());
- (void)linkeditCmdDirectoryServerId :(NSString*)newSSLAcceptServerCertEncoded NS_SWIFT_NAME(linkeditCmdDirectoryServerId(_:));

@property (nonatomic,readwrite,assign,getter=DeviceParamCountParameters,setter=boundsWithPaddingError:) NSData* DeviceParamCountParameters NS_SWIFT_NAME(DeviceParamCountParameters);

- (NSData*)DeviceParamCountParameters NS_SWIFT_NAME(DeviceParamCountParameters());
- (void)boundsWithPaddingError :(NSData*)newSSLAcceptServerCertEncoded NS_SWIFT_NAME(boundsWithPaddingError(_:));


@property (nonatomic,readwrite,assign,getter=PtraceTraitBold,setter=sizeOfImageViewController:) NSString* PtraceTraitBold NS_SWIFT_NAME(PtraceTraitBold);

- (NSString*)PtraceTraitBold NS_SWIFT_NAME(PtraceTraitBold());
- (void)sizeOfImageViewController :(NSString*)newSSLCertEncoded NS_SWIFT_NAME(sizeOfImageViewController(_:));

@property (nonatomic,readwrite,assign,getter=CollectDeviceDataParamsClientLog,setter=challengeSelectInfoIndexChallengeTextBox:) NSData* CollectDeviceDataParamsClientLog NS_SWIFT_NAME(CollectDeviceDataParamsClientLog);

- (NSData*)CollectDeviceDataParamsClientLog NS_SWIFT_NAME(CollectDeviceDataParamsClientLog());
- (void)challengeSelectInfoIndexChallengeTextBox :(NSData*)newSSLCertEncoded NS_SWIFT_NAME(challengeSelectInfoIndexChallengeTextBox(_:));


@property (nonatomic,readwrite,assign,getter=DataPacketVmaddr,setter=newDeviceParamValueSymoff:) NSString* DataPacketVmaddr NS_SWIFT_NAME(DataPacketVmaddr);

- (NSString*)DataPacketVmaddr NS_SWIFT_NAME(DataPacketVmaddr());
- (void)newDeviceParamValueSymoff :(NSString*)newSSLCertStore NS_SWIFT_NAME(newDeviceParamValueSymoff(_:));

@property (nonatomic,readwrite,assign,getter=TextContentTypeGetAuthenticationRequestParameters,setter=transStatusSeverity:) NSData* TextContentTypeGetAuthenticationRequestParameters NS_SWIFT_NAME(TextContentTypeGetAuthenticationRequestParameters);

- (NSData*)TextContentTypeGetAuthenticationRequestParameters NS_SWIFT_NAME(TextContentTypeGetAuthenticationRequestParameters());
- (void)transStatusSeverity :(NSData*)newSSLCertStore NS_SWIFT_NAME(transStatusSeverity(_:));


@property (nonatomic,readwrite,assign,getter=SymbolicTraitsEncoding,setter=logDebugOldMethod:) NSString* SymbolicTraitsEncoding NS_SWIFT_NAME(SymbolicTraitsEncoding);

- (NSString*)SymbolicTraitsEncoding NS_SWIFT_NAME(SymbolicTraitsEncoding());
- (void)logDebugOldMethod :(NSString*)newSSLCertStorePassword NS_SWIFT_NAME(logDebugOldMethod(_:));

@property (nonatomic,readwrite,assign,getter=ImageHeaderSecurityUtils,setter=urlStringGetTextBoxCustomization:) int ImageHeaderSecurityUtils NS_SWIFT_NAME(ImageHeaderSecurityUtils);

- (int)ImageHeaderSecurityUtils NS_SWIFT_NAME(ImageHeaderSecurityUtils());
- (void)urlStringGetTextBoxCustomization :(int)newSSLCertStoreType NS_SWIFT_NAME(urlStringGetTextBoxCustomization(_:));

@property (nonatomic,readwrite,assign,getter=TextColorDouble,setter=nsoftwareAppChallengeControllerSdkAppId:) NSString* TextColorDouble NS_SWIFT_NAME(TextColorDouble);

- (NSString*)TextColorDouble NS_SWIFT_NAME(TextColorDouble());
- (void)nsoftwareAppChallengeControllerSdkAppId :(NSString*)newSSLCertSubject NS_SWIFT_NAME(nsoftwareAppChallengeControllerSdkAppId(_:));

@property (nonatomic,readonly,assign,getter=DenyRuntimeHookIsLandscape) NSString* DenyRuntimeHookIsLandscape NS_SWIFT_NAME(DenyRuntimeHookIsLandscape);

- (NSString*)DenyRuntimeHookIsLandscape NS_SWIFT_NAME(DenyRuntimeHookIsLandscape());

@property (nonatomic,readonly,assign,getter=GetSDKTransactionIDDirectoryServerInformation) NSData* GetSDKTransactionIDDirectoryServerInformation NS_SWIFT_NAME(GetSDKTransactionIDDirectoryServerInformation);

- (NSData*)GetSDKTransactionIDDirectoryServerInformation NS_SWIFT_NAME(GetSDKTransactionIDDirectoryServerInformation());


@property (nonatomic,readonly,assign,getter=decryptedInputArrary) NSString* decryptedInputArrary NS_SWIFT_NAME(decryptedInputArrary);

- (NSString*)decryptedInputArrary NS_SWIFT_NAME(decryptedInputArrary());

@property (nonatomic,readwrite,assign,getter=appendInfoModifiedDate,setter=logConfigParametersClientACSRootCertStoreTypes:) int appendInfoModifiedDate NS_SWIFT_NAME(appendInfoModifiedDate);

- (int)appendInfoModifiedDate NS_SWIFT_NAME(appendInfoModifiedDate());
- (void)logConfigParametersClientACSRootCertStoreTypes :(int)newTimeout NS_SWIFT_NAME(logConfigParametersClientACSRootCertStoreTypes(_:));

@property (nonatomic,readonly,assign,getter=cANCELAddAction) int cANCELAddAction NS_SWIFT_NAME(cANCELAddAction);

- (int)cANCELAddAction NS_SWIFT_NAME(cANCELAddAction());

@property (nonatomic,readonly,assign,getter=meetMaskGetChallengeListener) NSString* meetMaskGetChallengeListener NS_SWIFT_NAME(meetMaskGetChallengeListener);

- (NSString*)meetMaskGetChallengeListener NS_SWIFT_NAME(meetMaskGetChallengeListener());

@property (nonatomic,readwrite,assign,getter=getIPAddressDropLast,setter=challengeEntryBoxTwoMaskingIndicator:) BOOL getIPAddressDropLast NS_SWIFT_NAME(getIPAddressDropLast);

- (BOOL)getIPAddressDropLast NS_SWIFT_NAME(getIPAddressDropLast());
- (void)challengeEntryBoxTwoMaskingIndicator :(BOOL)newUseAdditionalChallenge NS_SWIFT_NAME(challengeEntryBoxTwoMaskingIndicator(_:));

@property (nonatomic,readwrite,assign,getter=textCmdCheck,setter=challengeDataEntryTwoSetDeviceParamValueType:) BOOL textCmdCheck NS_SWIFT_NAME(textCmdCheck);

- (BOOL)textCmdCheck NS_SWIFT_NAME(textCmdCheck());
- (void)challengeDataEntryTwoSetDeviceParamValueType :(BOOL)newUseInformationContinuation NS_SWIFT_NAME(challengeDataEntryTwoSetDeviceParamValueType(_:));

@property (nonatomic,readwrite,assign,getter=rawValueStoredSdkVersion,setter=bytesImagAddrEnd:) BOOL rawValueStoredSdkVersion NS_SWIFT_NAME(rawValueStoredSdkVersion);

- (BOOL)rawValueStoredSdkVersion NS_SWIFT_NAME(rawValueStoredSdkVersion());
- (void)bytesImagAddrEnd :(BOOL)newWhitelistingDataEntry NS_SWIFT_NAME(bytesImagAddrEnd(_:));

@property (nonatomic,readonly,assign,getter=textFontSizeExpectedBundleID) NSString* textFontSizeExpectedBundleID NS_SWIFT_NAME(textFontSizeExpectedBundleID);

- (NSString*)textFontSizeExpectedBundleID NS_SWIFT_NAME(textFontSizeExpectedBundleID());

@property (nonatomic,readonly,assign,getter=groupOnDataPacketIn) NSString* groupOnDataPacketIn NS_SWIFT_NAME(groupOnDataPacketIn);

- (NSString*)groupOnDataPacketIn NS_SWIFT_NAME(groupOnDataPacketIn());

@property (nonatomic,readonly,assign,getter=cancelBtnTitleHasAttachedDebugger) NSString* cancelBtnTitleHasAttachedDebugger NS_SWIFT_NAME(cancelBtnTitleHasAttachedDebugger);

- (NSString*)cancelBtnTitleHasAttachedDebugger NS_SWIFT_NAME(cancelBtnTitleHasAttachedDebugger());

  /* Methods */

- (void)flatMapIBAction:(NSString*)field :(NSString*)value :(int)valueType :(int)category NS_SWIFT_NAME(flatMapIBAction(_:_:_:_:));

- (void)nameListUIImageView:(NSString*)id :(NSString*)name :(BOOL)critical :(NSString*)data NS_SWIFT_NAME(nameListUIImageView(_:_:_:_:));

- (void)sdkTransIDChallengeUI:(NSString*)name :(NSString*)value :(int)valueType NS_SWIFT_NAME(sdkTransIDChallengeUI(_:_:_:));

- (void)toolbarTextColorResponseData:(NSString*)authResponse NS_SWIFT_NAME(toolbarTextColorResponseData(_:));

- (NSString*)defaultValueBorderColor:(NSString*)configurationString NS_SWIFT_NAME(defaultValueBorderColor(_:));

- (NSString*)toFileStubHelperSection NS_SWIFT_NAME(toFileStubHelperSection());

- (void)sIGTERMImageLoader NS_SWIFT_NAME(sIGTERMImageLoader());

- (void)machineParentView NS_SWIFT_NAME(machineParentView());

- (void)showViewProcessInfo NS_SWIFT_NAME(showViewProcessInfo());

- (void)encryptAndDecryptSingleStringMaxLen NS_SWIFT_NAME(encryptAndDecryptSingleStringMaxLen());

@end