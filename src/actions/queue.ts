import mapValues from 'lodash-es/mapValues';
import omit from 'lodash-es/omit';

import { firebaseTrackIdSelector } from '../selectors/track';
import { Track, TrackReference } from '../state';
import { requireAuth } from '../util/auth';
import firebase, { firebaseNS } from '../util/firebase';

import { PayloadAction, Types } from '.';

export type Actions =
    | RemoveTrackAction
    | RequestSetVoteAction
    | SetVoteAction;

export interface RemoveTrackAction extends PayloadAction<[TrackReference, boolean]> {
    type: Types.REMOVE_TRACK;
}

export interface RequestSetVoteAction extends PayloadAction<[TrackReference, boolean]> {
    type: Types.REQUEST_SET_VOTE;
}

export interface SetVoteAction extends PayloadAction<[TrackReference, boolean]> {
    type: Types.SET_VOTE;
}

export function markTrackAsPlayed(partyId: string, ref: TrackReference): Promise<void> {
    return firebase.database!()
        .ref('/tracks')
        .child(partyId)
        .child(firebaseTrackIdSelector(ref))
        .child('played_at')
        .set(firebaseNS.database!.ServerValue.TIMESTAMP);
}

/**
 * Pins a track to the top of the queue.
 *
 * @param partyId the ID of the affected party
 * @param ref the ref of the track to pin
 */
export function pinTrack(partyId: string, ref: TrackReference): Promise<void> {
    return firebase.database!()
        .ref('/tracks')
        .child(partyId)
        .child(firebaseTrackIdSelector(ref))
        .child('order')
        .set(Number.MIN_SAFE_INTEGER + 1);
}

export async function removeTrack(
    partyId: string,
    track: Track,
    moveToHistory: boolean,
) {
    const trackId = firebaseTrackIdSelector(track);
    const updates: any[] = [
        firebase.database!()
            .ref('/tracks')
            .child(partyId)
            .child(trackId)
            .set(null),
        firebase.database!()
            .ref('/votes')
            .child(partyId)
            .child(trackId)
            .set(null),
        firebase.database!()
            .ref('/votes_by_user')
            .child(partyId)
            .transaction(votes => mapValues(votes, userVotes => omit(userVotes, trackId))),
    ];
    if (moveToHistory) {
        updates.push(
            firebase.database!()
                .ref('/tracks_played')
                .child(partyId)
                .push(track),
        );
    }

    await Promise.all(updates);
}

export function removeTrackAction(ref: TrackReference, moveToHistory: boolean): RemoveTrackAction {
    return {
        type: Types.REMOVE_TRACK,
        payload: [ref, moveToHistory],
    };
}

export function requestSetVoteAction(ref: TrackReference, vote: boolean): RequestSetVoteAction {
    return {
        type: Types.REQUEST_SET_VOTE,
        payload: [ref, vote],
    };
}

export async function setVote(
    partyId: string,
    ref: TrackReference,
    vote: boolean,
) {
    const { uid } = await requireAuth();
    const trackId = firebaseTrackIdSelector(ref);

    const a = firebase.database!()
        .ref('/votes')
        .child(partyId)
        .child(trackId)
        .child(uid)
        .set(vote);
    const b = firebase.database!()
        .ref('/votes_by_user')
        .child(partyId)
        .child(uid)
        .child(trackId)
        .set(vote);

    await Promise.all([a, b]);
}

export function setVoteAction(ref: TrackReference, vote: boolean): SetVoteAction {
    return {
        type: Types.SET_VOTE,
        payload: [ref, vote],
    };
}
