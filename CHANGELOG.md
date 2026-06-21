# Changelog

All notable changes to the Spectrum Mobile App will be documented in this file.

## [Unreleased]

### Phone Number Normalization in Login
- **src/screens/LoginScreen.js** — `validateInput()`: Stripped all spaces from phone input before validating against the Saudi phone regex, so users can type `+966 5XXXXXXXX` with or without spaces and validation passes consistently.
- **src/screens/LoginScreen.js** — `handleContinue()`: Normalized phone input (stripped spaces) before sending to the `sendOtp` API and before navigating to `OTPScreen`. Previously the raw user input (with spaces) was sent directly, which could cause lookup mismatches on the backend.

### ELM (Yakeen) Identity Verification Integration
- **Patient Registration (PatientInfoScreen.js)**:
  - Removed manual name input field - name now fetched from ELM
  - Added ELM data display section showing verified name, gender, nationality
  - Auto-detects ID type from first digit (1=Saudi NIN, 2=Iqama)
  - Updated form validation to check ELM verification instead of fullName
  - Updated consent payload to pass `elmData` object
- **Elm.Service.js**: Removed `isSaudi` parameter (now auto-detected)
- **EditProfileForm.js**: Made gender field read-only when patient is ELM-verified
  - Shows static text instead of dropdown for verified patients
- **Mandatory Re-verification Flow**:
  - **ElmVerificationRequiredScreen.js**: New blocking verification screen
    - Requires unverified patients to verify via ELM before using app
    - National ID + DOB input with format toggle (Gregorian/Hijri)
    - Shows verified data for confirmation before saving
    - Logout option available
    - Redirects to home after successful verification
  - **AppNavigator.js**: Added ElmVerifiedTabNavigator wrapper
    - Checks `user.elmVerified` on Main screen mount
    - Redirects to ElmVerificationRequired if not verified
    - Added ElmVerificationRequired screen (gesture disabled)
- **User.Service.js**: Added `updateElmVerification()` function

### Doctor Profile
- Fix empty About, Languages, and Certifications sections on doctor profile page
- Update SearchResultsScreen to pass complete doctor data including professional summary, spoken languages, and education fields
- Add fallback to doctor navigation params for languages and education in DoctorProfileScreen when userProfile API fails

### Video Conference
- Fix video disappearing when switching between speaker and gallery views
- Improve speaker view layout: large remote video with small local overlay
- Add key props to video views to force re-render on layout change
- Add useEffect to re-attach streams when layout changes
- Fix provider not detected when joining before patient (roomStreamUpdate now adds participant)
- Add proper Speaker View and Gallery View layouts optimized for mobile
- Add thumbnail strip in speaker view for multi-participant calls (3+ users)
- Show all other participants as scrollable thumbnails below main speaker
- Allow tapping thumbnail to swap main speaker (user can select who to focus on)
- Reduce thumbnail size to maximize main speaker video area
- Reduce stream playback delay from 500ms to 200ms for faster video display
- Add AppState listener for background/foreground detection
- Add heartbeat mechanism for presence detection (10-second interval)
- Send leaveRoom signal on disconnect, background, and unmount
- Update waiting condition to check both participants and remote streams
- Fix room rejoin issue: properly destroy engine before recreating on rejoin
- Force refetch room data on mount to ensure fresh state for rejoins
- Add cache bypass (staleTime: 0, refetchOnMount: always) for room data
- Fix room rejoin stuck issue: add isEngineReady state to ensure login waits for engine
- Reset initialization state on component unmount/remount for proper rejoin flow

### Socket
- Increase reconnection attempts from 5 to 10
- Add exponential backoff with randomization factor
- Reduce initial reconnection delay from 1000ms to 500ms
- Add max reconnection delay cap at 5000ms
- Increase connection timeout from 10s to 20s

### Home Screen
- Filter top providers to show only active providers (client-side filtering)

### UI/UX
- Add layout toggle button in TopBar (speaker/gallery icons)
- Default to speaker view for better 1-on-1 call experience
- Add thumbnail strip in speaker view for other participants
- Improve gallery grid sizing based on participant count
- Add Hijri calendar date picker with full Arabic/English support
- Replace manual Hijri text input with interactive calendar picker
- Show Gregorian date preview when selecting Hijri date
- Add upcoming appointment card on home screen for logged in users
- Show nearest upcoming appointment with doctor photo, name, specialty
- Display time badge showing "Ongoing", "Now", "In X min/hours/days" based on appointment status
- Add green "Ongoing" badge style when appointment is in progress
- Add date and time badges with icons
- Show video call button only 10 minutes before appointment start (matches AppointmentsScreen logic)
- Add circular video call button when appointment has video room link
- Card design with left teal accent bar and white background
- Improved time display format (12-hour with AM/PM)
- Added Arabic/English translations for appointment section
- Fixed video link navigation to correct screen name (VideoConsultation)

### Patient Registration / Patient Info Screen
- Fix authorization token error for new user signature upload
- Use guest upload endpoint for new user registration (no auth required)
- Add uploadGuestSignature function in Upload.Service.js
- Fix input field design: add white background to Full Name and National ID inputs
- Fix signature box: white background and gray300 border to match other inputs
- Fix signature pad scrolling: disable scroll while signing using isSigningActive state
- Add hijriDob to consent payload for Hijri date support

### Code Cleanup
- Remove unused backup file (VideoConsultationScreen.backup.js)
