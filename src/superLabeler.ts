import fs from 'fs';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github';

import { checkDryRun, log } from './utils';
import { applyIssueLabels, applyPRLabels } from './applyLabels';
import { Config, Options } from './types';
import {
  IssueContext,
  parseIssueContext,
  parsePRContext,
  PRContext,
} from './parseContext';
import {getLabels} from './api/getLabels';
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

  async run () {
    try {

      const configPath = this.opts.configPath;
      const repo = context.repo;

      // Load config
      if (!fs.existsSync(configPath)) {
        throw new Error(`config not found at "${configPath}"`);
      }
      const config: Config = JSON.parse(fs.readFileSync(configPath).toString());
      log(`Config`, config);

      let curContext:
        | { type: 'pr'; context: PRContext }
        | { type: 'issue'; context: IssueContext };
      if (context.payload.pull_request) {
        const ctx = await parsePRContext(context, this.client, repo);
        if (!ctx) {
          throw new Error('pull request not found on context');
        }
        log(`PR context`, ctx);

        curContext = {
          type: 'pr',
          context: ctx,
        };
      } else if (context.payload.issue) {
        const ctx = parseIssueContext(context);
        if (!ctx) {
          throw new Error('issue not found on context');
        }
        log(`issue context`, ctx );

        curContext = {
          type: 'issue',
          context: ctx,
        };
      } else {
        log({title:'Exit due no context provided', type: 'warn'}, `Run "yarn dev:pr" or "yarn dev:issue" to pass proper context from local *.json`)
        return;
      }

      await checkDryRun( 
        async () => {
          log({title:'Sync labels', type: 'action'},"Syncing labels...")
          await syncLabels({ client: this.client, repo, config: config.labels })
        }, 
        () => log({title:'Skipped due to dryRun flag enabled', type: 'warn'},"Sync labels")
      );

      // Mapping of label ids to Github names
      const labelIdToName = Object.entries(config.labels).reduce(
        (acc: { [key: string]: string }, cur) => {
          acc[cur[0]] = cur[1].name;
          return acc;
        },
        {},
      );

      if (curContext.type === 'pr') {
        await applyPRLabels({
          client: this.client,
          config: config.pr,
          skipLabeling: config.skip_labeling,
          labelIdToName,
          prContext: curContext.context,
          repo,
        });
      } else if (curContext.type === 'issue') {
        await applyIssueLabels({
          client: this.client,
          config: config.issue,
          skipLabeling: config.skip_labeling,
          issueContext: curContext.context,
          labelIdToName,
          repo,
        });
      }
    } catch (err) {
      log({title: 'Error occurs', type: 'error'}, err.message);
      core.setFailed(err.message);
    }
  }

  async labelIssue ( issueToLabel: any ) {
    console.log(issueToLabel)
    const repo = context.repo;

    const labels = await getLabels({client: this.client, repo})

    const issueLabels = issueToLabel.labels
    const attachLabels = issueLabels.reduce((result: any,currLabel: any)=> {
      const name = currLabel.name
      const matches = labels.reduce((matches:any, currRepoLabel: any) => {
        
        const isMatch = currRepoLabel.name === name
        const mappedName = name
        return isMatch ? [...matches, mappedName] : matches
      },[])

      return [...result,...matches]
    },[])

    console.log(attachLabels)
    return attachLabels
  }
};

export default ActionSuperLabeler;