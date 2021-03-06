import { Track } from '../state';

import { ErrorAction, PayloadAction, Types } from '.';

export type Actions =
    | ChangeDisplayLoginModalAction
    | ChangeTrackSearchInputAction
    | SearchStartAction
    | SearchFinishAction
    | SearchFailAction;

export interface ChangeDisplayLoginModalAction extends PayloadAction<boolean> {
    type: Types.CHANGE_DISPLAY_LOGIN_MODAL;
}

export interface ChangeTrackSearchInputAction extends PayloadAction<string> {
    type: Types.CHANGE_TRACK_SEARCH_INPUT;
}

export interface SearchStartAction {
    type: Types.SEARCH_Start;
}

export interface SearchFinishAction extends PayloadAction<Record<string, Track>> {
    type: Types.SEARCH_Finish;
}

export interface SearchFailAction extends ErrorAction {
    type: Types.SEARCH_Fail;
}

export function changeDisplayLoginModal(display: boolean): ChangeDisplayLoginModalAction {
    return {
        type: Types.CHANGE_DISPLAY_LOGIN_MODAL,
        payload: display,
    };
}

export function changeTrackSearchInput(text: string): ChangeTrackSearchInputAction {
    return {
        type: Types.CHANGE_TRACK_SEARCH_INPUT,
        payload: text,
    };
}

export function eraseTrackSearchInput(): ChangeTrackSearchInputAction {
    return changeTrackSearchInput('');
}

export function searchFail(error: Error): SearchFailAction {
    return {
        type: Types.SEARCH_Fail,
        error: true,
        payload: error,
    };
}

export function searchFinish(tracks: Record<string, Track>): SearchFinishAction {
    return {
        type: Types.SEARCH_Finish,
        payload: tracks,
    };
}

export function searchStart(): SearchStartAction {
    return { type: Types.SEARCH_Start };
}
