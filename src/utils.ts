import * as core from '@actions/core';
import {italic, gray, blue, red, yellow, green, bold} from 'colorette';

import {LogSetting} from './types';

const {SHOW_LOGS: ENV_SHOW_LOGS, GH_ACTION_LOCAL_TEST} = process.env;

const DRY_RUN = !!GH_ACTION_LOCAL_TEST;
const SHOW_LOGS = ENV_SHOW_LOGS === 'true';

export const formatColour = (colour: string) => {
  if (colour[0] === '#') {
    return colour.substr(1);
  } else {
    return colour;
  }
};

export const processRegExpPattern = (pattern: string) => {
  const matchDelimiters = pattern.match(/^\/(.*)\/(.*)$/);

  const [, source, flags] = matchDelimiters || [];

  return new RegExp(source || pattern, flags);
};
export const normalize = (text: string) => (text || '').toUpperCase();

export const checkDryRun = (action: Function, dryRunAction: Function) =>
  DRY_RUN ? dryRunAction() : action();

export const log = (header: string | LogSetting, object: {} = {}) => {
  let title = '';
  let type: LogSetting['type'];
  if (typeof header === `string`) {
    title = header;
  }
  if (typeof header === 'object') {
    title = header.title;
    type = header.type;
  }

  if (SHOW_LOGS) {
    const getTypeTile = (type: LogSetting['type']) => {
      if (type === 'error') return red('::error::');
      if (type === 'warn') return yellow('::warn::');
      if (type === 'action') return green('::action::');
      return blue(`::logging::`);
    };
    // eslint-disable-next-line
    console.log(bold(getTypeTile(type)), italic(gray(`${title}: `)), object);
  } else {
    core.debug(`${title}: ${JSON.stringify(object)}`);
  }
};
