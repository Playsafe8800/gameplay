import { LibInitParams } from './@types';
import { AlertPopup, ToastPopup } from './AlertPopup';
import { AutomationSuite } from './automationSuite';
import { CGsLib } from './connections';

export * as authMe from './auth-me';
export const alertPopup = new AlertPopup();
export const toast = new ToastPopup();
export const automationSuite = new AutomationSuite();

export function Init(params: LibInitParams) {
  CGsLib.Initialize(params);
}
