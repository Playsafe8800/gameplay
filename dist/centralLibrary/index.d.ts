import { LibInitParams } from './@types';
import { AlertPopup, ToastPopup } from './AlertPopup';
import { AutomationSuite } from './automationSuite';
export * as authMe from './auth-me';
export declare const alertPopup: AlertPopup;
export declare const toast: ToastPopup;
export declare const automationSuite: AutomationSuite;
export declare function Init(params: LibInitParams): void;
