import { IssueCondition, PRCondition } from './conditions';

export interface IssueConditionConfig  {
  requires: number;
  conditions: IssueCondition[];
}

export interface PRConditionConfig {
  requires: number;
  conditions: PRCondition[];
}

export type Fallback =
  | Array<string>
  | { labels: Array<string>; fallbackActivationValue: number };

export interface Config {
  labels: {
    [key: string]: {
      name: string;
      colour: string;
      description: string;
    };
  };
  issue: {
    [key: string]: IssueConditionConfig;
  };
  issue_fallback: Fallback;
  pr: {
    [key: string]: PRConditionConfig;
  };
  skip_labeling: string;
  pr_fallback: Fallback;
}

export interface Options {
  configPath: string;
  showLogs: boolean;
}

export type LogSetting = {
  title: string;
  type?: 'error' | 'warn' | 'info' | 'action';
};
