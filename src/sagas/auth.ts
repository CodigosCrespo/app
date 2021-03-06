import { User } from '@firebase/auth-types';
import { HttpsCallableResult, HttpsError } from '@firebase/functions-types';
import { replace, LOCATION_CHANGED } from '@mraerino/redux-little-router-reactless';
import { delay } from 'redux-saga';
import { apply, call, fork, put, takeEvery } from 'redux-saga/effects';

import { Types } from '../actions';
import { exchangeCodeFail, notifyAuthStatusKnown, TriggerOAuthLoginAction } from '../actions/auth';
import { getProvider, requireAuth } from '../util/auth';
import firebase from '../util/firebase';

function* checkInitialLogin() {
    const user: User = yield call(requireAuth);
    if (user.isAnonymous) {
        return;
    }
    const strippedProviderId = user.providerId.replace('.com', '');
    yield put(notifyAuthStatusKnown(strippedProviderId as any, user));
}

function* handleOAuthRedirect() {
    try {
        yield firebase.auth!().getRedirectResult();
    } catch (err) {
        let e;

        switch (err.code) {
            case 'auth/credential-already-in-use':
                yield firebase.auth!().signInAndRetrieveDataWithCredential(err.credential);
                return;
            case 'auth/web-storage-unsupported':
                e = new Error("Your browser is not supported or has third party cookies disabled.");
                break;
            default:
                e = new Error(`Failed to perform OAuth ${err.code}: ${err.message}`);
                break;
        }

        yield put(exchangeCodeFail((err.credential && err.credential.providerId) || 'firebase', e));
    }

    // The main saga calls checkInitialLogin here, which calls requireAuth
}

/**
 * This saga forcefully refreshes the user token every 55 minutes
 * to prevent Firebase from disconnecting and thus destroying playback.
 */
function* refreshFirebaseAuth() {
    while (true) {
        yield call(delay, 1000 * 60 * 55);

        const { currentUser } = firebase.auth!();
        if (!currentUser) {
            continue;
        }

        // Retry five times
        for (let i = 0; i < 5; i++) {
            try {
                yield apply(currentUser, currentUser.getIdToken, [true]);
                break;
            } catch (err) {
                const duration = 5000 * i;
                console.warn(`Failed to forcefully reauth user, trying again after ${duration / 1000}s.`, err);
                yield call(delay, duration);
            }
        }
    }
}

function* triggerOAuthLogin(ac: TriggerOAuthLoginAction) {
    if (ac.payload === 'spotify') { // handled in ./spotify-auth.ts
        return;
    }

    try {
        const user: User = yield call(requireAuth);
        yield user.linkWithRedirect(getProvider(ac.payload));
    } catch (err) {
        const e = (err.code === 'auth/provider-already-linked') // tslint:disable-next-line:max-line-length
            ? new Error(`Failed to start OAuth because the account is already linked with an account from ${ac.payload}.`)
            : new Error(`Failed to start OAuth with code ${err.code}: ${err.message}`);
        yield put(exchangeCodeFail(ac.payload, e));
    }
}

export default function*() {
    yield fork(refreshFirebaseAuth);
    yield takeEvery(Types.TRIGGER_OAUTH_LOGIN, triggerOAuthLogin);

    yield* handleOAuthRedirect();
    yield* checkInitialLogin();
}
