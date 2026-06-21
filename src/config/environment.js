import {
    API_URL, FILE_URL, FRONT_END_URL,
    HYPERPAY_MODE, HYPERPAY_TEST_URL, HYPERPAY_PROD_URL,
    FIREBASE_PROJECT_ID, FIREBASE_API_KEY_IOS, FIREBASE_API_KEY_ANDROID,
    APP_BUNDLE_ID, APP_SCHEME, PAYMENT_RESULT_URL,
} from '@env';

export default {
    api_url: API_URL,
    file_url: FILE_URL,
    front_end: FRONT_END_URL,

    hyperpay_mode: HYPERPAY_MODE,
    hyperpay_test_base_url: HYPERPAY_TEST_URL,
    hyperpay_prod_base_url: HYPERPAY_PROD_URL,

    firebase_project_id: FIREBASE_PROJECT_ID,
    firebase_api_key_ios: FIREBASE_API_KEY_IOS,
    firebase_api_key_android: FIREBASE_API_KEY_ANDROID,

    app_bundle_id: APP_BUNDLE_ID,
    app_scheme: APP_SCHEME,
    payment_result_url: PAYMENT_RESULT_URL,
};

