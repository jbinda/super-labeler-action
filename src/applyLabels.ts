import * as core from '@actions/core';
import { GitHub } from '@actions/github';

import { Config } from './types';
import { addLabel, removeLabel, Repo } from './api';
import evaluator, {ConditionSetType} from './conditions/evaluator';
import { IssueContext, PRContext, Labels } from './parseContext';

type LabelIDToName =  { [key: string]: string };

const skipLabelingLabelAssigned = (curLabels: Labels, labelIdToName: LabelIDToName, skipLabeling: string) => Object.values(curLabels).map(({name}) => name).some((existingLabel) => existingLabel === labelIdToName[skipLabeling])

const addRemoveLabel = async ({
  client,
  curLabels,
  labelID,
  labelName,
  IDNumber,
  repo,
  shouldHaveLabel,
}: {
  client: GitHub;
  curLabels: Labels;
  labelID: string;
  labelName: string;
  IDNumber: number;
  repo: Repo;
  shouldHaveLabel: boolean;
}) => {
  const hasLabel = curLabels.filter((l) => l.name === labelName).length > 0;
  if (shouldHaveLabel && !hasLabel) {
    core.debug(`Adding label "${labelID}"...`);
    await addLabel({ client, repo, IDNumber, label: labelName });
  }
  if (!shouldHaveLabel && hasLabel) {
    core.debug(
      `Removing label "${labelID}"...`,
    );
    await removeLabel({ client, repo, IDNumber, label: labelName });
  }
};

export const applyIssueLabels = async ({
  client,
  config,
  skipLabeling,
  issueContext,
  labelIdToName,
  repo,
}: {
  client: GitHub;
  config: Config['issue'];
  skipLabeling: string;
  issueContext: IssueContext;
  labelIdToName: LabelIDToName;
  repo: Repo;
}) => {
  const { labels: curLabels, issueProps, IDNumber } = issueContext;
  for (const [labelID, conditionsConfig] of Object.entries(config)) {
    core.debug(`Label: ${labelID}`);

    const shouldHaveLabel = evaluator(ConditionSetType.issue, conditionsConfig, issueProps)

    await addRemoveLabel({
      client,
      curLabels,
      labelID,
      labelName: labelIdToName[labelID],
      IDNumber,
      repo,
      shouldHaveLabel,
    });
  }
};

export const applyPRLabels = async ({
  client,
  config,
  labelIdToName,
  skipLabeling,
  prContext,
  repo,
}: {
  client: GitHub;
  config: Config['pr'];
  skipLabeling: string;
  labelIdToName: LabelIDToName;
  prContext: PRContext;
  repo: Repo;
}) => {
  const { labels: curLabels, prProps, IDNumber } = prContext;
  for (const [labelID, conditionsConfig] of Object.entries(config)) {
    core.debug(`Label: ${labelID}`);

    const shouldHaveLabel = evaluator(ConditionSetType.issue, conditionsConfig, prProps)

    await addRemoveLabel({
      client,
      curLabels,
      labelID,
      labelName: labelIdToName[labelID],
      IDNumber,
      repo,
      shouldHaveLabel,
    });
  }
};
