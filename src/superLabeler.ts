import fs from 'fs';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github';

import { applyIssueLabels, applyPRLabels } from './applyLabels';
// import { IssueCondition, PRCondition } from './conditions';
import { Config, Options } from './types';
import {
  IssueContext,
  parseIssueContext,
  parsePRContext,
  PRContext,
} from './parseContext';
import syncLabels from './syncLabels';

const context = github.context;

const dryRun = !!process.env.GH_ACTION_LOCAL_TEST;

class ActionSuperLabeler {
  client: GitHub;
  opts: Options;

  constructor(client: any, options: any) {
    this.client = client;
    this.opts = options;
  }

  _log(message:string) {
    if (!this.opts.showLogs) return;
    console.log(message);
  }

  async showContext () {
    console.log(this.opts)
    console.log('context', context.repo)
  }

async run () {
  try {

    const configPath = this.opts.configPath;
    const repo = context.repo;

    // Load config
    if (!fs.existsSync(configPath)) {
      throw new Error(`config not found at "${configPath}"`);
    }
    const config: Config = JSON.parse(fs.readFileSync(configPath).toString());
    core.debug(`Config: ${JSON.stringify(config)}`);

    let curContext:
      | { type: 'pr'; context: PRContext }
      | { type: 'issue'; context: IssueContext };
    if (context.payload.pull_request) {
      const ctx = await parsePRContext(context, this.client, repo);
      if (!ctx) {
        throw new Error('pull request not found on context');
      }
      core.debug(`PR context: ${JSON.stringify(ctx)}`);

      console.log(ctx.prProps.files)
      curContext = {
        type: 'pr',
        context: ctx,
      };
    } else if (context.payload.issue) {
      const ctx = parseIssueContext(context);
      if (!ctx) {
        throw new Error('issue not found on context');
      }
      core.debug(`issue context: ${JSON.stringify(ctx)}`);

      curContext = {
        type: 'issue',
        context: ctx,
      };
    } else {
      return;
    }
    console.log(curContext)

    if (!dryRun) await syncLabels({ client: this.client, repo, config: config.labels });

    // Mapping of label ids to Github names
    const labelIdToName = Object.entries(config.labels).reduce(
      (acc: { [key: string]: string }, cur) => {
        acc[cur[0]] = cur[1].name;
        return acc;
      },
      {},
    );
    
    console.log(labelIdToName)

    if (curContext.type === 'pr') {
      await applyPRLabels({
        client: this.client,
        config: config.pr,
        labelIdToName,
        prContext: curContext.context,
        repo,
      });
    } else if (curContext.type === 'issue') {
      await applyIssueLabels({
        client: this.client,
        config: config.issue,
        issueContext: curContext.context,
        labelIdToName,
        repo,
      });
    }
  } catch (err) {
    core.error(err.message);
    core.setFailed(err.message);
  }
}};

module.exports = ActionSuperLabeler;