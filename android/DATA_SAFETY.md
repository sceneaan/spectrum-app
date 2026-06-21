# Google Play Store Data Safety Declaration

This document outlines the data collection and sharing practices for the Spectrum healthcare app.
Use this information when completing the Data Safety form in the Google Play Console.

---

## Overview

Spectrum is a telemedicine and healthcare management application that collects user data
to provide medical consultations, appointment booking, and health record management services.

**App Category:** Medical / Health & Fitness
**Target Audience:** Adults (18+)

---

## Data Collection Summary

### 1. Personal Information

| Data Type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Name | Yes | With healthcare providers | Account, Healthcare services | Yes |
| Email address | Yes | No | Account management, Communications | Yes |
| Phone number | Yes | No | Account verification, Appointments | Yes |
| Address | Optional | With healthcare providers | In-person appointments | No |
| Date of birth | Yes | With healthcare providers | Medical records, Age verification | Yes |

### 2. Health Information

| Data Type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Medical records | Yes | With healthcare providers | Healthcare services | Yes |
| Prescriptions | Yes | With pharmacies (user consent) | Medication management | No |
| Health conditions | Yes | With healthcare providers | Medical consultations | Yes |
| Lab results | Yes | With healthcare providers | Medical records | No |

### 3. Financial Information

| Data Type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Payment info | Yes | Payment processor (Hyperpay) | Transactions | For paid services |
| Purchase history | Yes | No | Billing, Receipts | Yes |
| Insurance info | Optional | With healthcare providers | Claims processing | No |

### 4. Device & App Information

| Data Type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Crash logs | Yes | Sentry (error tracking) | App stability | Yes |
| Device identifiers | Yes | Firebase | Push notifications | Yes |
| App interactions | Yes | No | Analytics, Improvements | Yes |

### 5. Media

| Data Type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Photos | Optional | With healthcare providers | Medical documentation | No |
| Videos | Yes | Peer-to-peer only | Video consultations | For video visits |
| Audio | Yes | Peer-to-peer only | Video consultations | For video visits |

---

## Data Handling Practices

### Security Measures
- All data transmitted over HTTPS/TLS 1.3
- End-to-end encryption for video consultations
- Secure storage using industry-standard encryption
- Regular security audits and penetration testing

### Data Retention
- Account data: Retained while account is active + 7 years (medical records)
- Transaction data: Retained for 7 years (legal compliance)
- Crash logs: Retained for 90 days
- Video consultations: Not recorded/stored (real-time only)

### User Rights
- Users can request data export
- Users can request account deletion
- Users can opt-out of non-essential data collection
- Users can manage notification preferences

---

## Third-Party Services

### Data Processors

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|-------------|----------------|
| Firebase | Push notifications, Analytics | Device tokens, App events | https://firebase.google.com/support/privacy |
| Sentry | Error tracking | Crash logs, Device info | https://sentry.io/privacy/ |
| Hyperpay | Payment processing | Payment info | https://www.hyperpay.com/privacy |
| ZegoCloud | Video consultations | Real-time video/audio | https://www.zegocloud.com/privacy |

---

## Play Console Data Safety Form Responses

### Does your app collect or share any of the required user data types?
**Yes**

### Is all of the user data collected by your app encrypted in transit?
**Yes** - All network traffic uses HTTPS/TLS

### Do you provide a way for users to request that their data be deleted?
**Yes** - Users can request account deletion through the app or by contacting support

### Data Types to Declare:

1. **Personal info**
   - Name: Collected, shared with healthcare providers
   - Email: Collected, not shared
   - Phone number: Collected, not shared

2. **Health info**
   - Health info: Collected, shared with healthcare providers

3. **Financial info**
   - Purchase history: Collected, not shared
   - Payment info: Collected, shared with payment processor

4. **Photos and videos**
   - Photos: Collected, shared with healthcare providers (user-initiated)
   - Videos: Collected (real-time only), not stored

5. **Device or other IDs**
   - Device identifiers: Collected for push notifications

---

## Compliance

- HIPAA compliant (for US healthcare regulations)
- GDPR compliant (for EU users)
- Saudi PDPL compliant (for Saudi Arabia users)
- SOC 2 Type II certified

---

## Contact

For privacy inquiries:
- Email: privacy@spectrum.com
- Support: support@spectrum.com

Last updated: December 2024
