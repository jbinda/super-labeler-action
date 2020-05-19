import { GitHub } from '@actions/github';

import { Config, Fallback } from './types';
import { addLabel, removeLabel, Repo } from './api';
import evaluator, { ConditionSetType } from './conditions/evaluator';
import { checkDryRun, log } from './utils';

import { IssueContext, PRContext, Labels } from './parseContext';

type LabelIDToName = { [key: string]: string };

const skipLabelingLabelAssigned = (
  curLabels: Labels,
  labelIdToName: LabelIDToName,
  skipLabeling: string,
) =>
  Object.values(curLabels)
    .map(({ name }) => name)
    .some((existingLabel) => existingLabel === labelIdToName[skipLabeling]);

const getFallbackLabels = (configFallback: Fallback) =>
  Array.isArray(configFallback) ? configFallback : configFallback.labels;

const getNonFallbackLabels = (
  currentLabels: Labels,
  fallbackLabelNames: Array<string>,
) =>
  Object.keys(currentLabels).filter(([name]) => !fallbackLabelNames.includes(name))
    .length;

const getFallbackActivationValue = (configFallback: Fallback) =>
  Array.isArray(configFallback) ? 1 : configFallback.fallbackActivationValue;

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
    await checkDryRun( 
      async () => {
        log({title: `Adding label ID`, type: 'action'}, labelID)
        await addLabel({ client, repo, IDNumber, label: labelName })
      }, 
      () => log({title:'Skipped due dryRun flag enabled', type: 'warn'},`Adding label "${labelID}"`)
    );
    return 1;
  }
  if (!shouldHaveLabel && hasLabel) {
    await checkDryRun( 
      async () => {
        log({title: `Removing label ID`, type: 'action'}, labelID)
        await removeLabel({ client, repo, IDNumber, label: labelName })
      }, 
      () => log({title:'Skipped due dryRun flag enabled', type: 'warn'},`Removing label "${labelID}"`)
    );
    return -1;
  }
  return 0;
};

export const applyIssueLabels = async ({
  client,
  config,
  skipLabeling,
  configFallback,
  issueContext,
  labelIdToName,
  repo,
}: {
  client: GitHub;
  config: Config['issue'];
  skipLabeling?: string;
  configFallback?: Fallback;
  issueContext: IssueContext;
  labelIdToName: LabelIDToName;
  repo: Repo;
}) => {
  const { labels: curLabels, issueProps, IDNumber } = issueContext;

  if (skipLabeling !== undefined && skipLabelingLabelAssigned(curLabels, labelIdToName, skipLabeling)) {
    log({title: 'Skipped', type: 'warn'}, `Labeling skipped due to existing skipLabeling label`);
    return;
  }

  const commonProps = {
    client,
    curLabels,
    IDNumber,
    repo,
  };

  const fallbackLabels = configFallback ? getFallbackLabels(configFallback) : []
  const fallbackLabelNames = fallbackLabels.map((labelID) => labelIdToName[labelID])
  log(`Fallback labels`, fallbackLabels)
  let nonFallbackLabelsCount = getNonFallbackLabels(curLabels, fallbackLabelNames);
  log(`Init Non Fallback labels count`, nonFallbackLabelsCount)

  for (const [labelID, conditionsConfig] of Object.entries(config)) {
    log(`Processing label ID`, labelID);

    const shouldHaveLabel = evaluator(
      ConditionSetType.issue,
      conditionsConfig,
      issueProps,
    );

    const labelsManageResult = await addRemoveLabel({
      ...commonProps,
      labelID,
      labelName: labelIdToName[labelID],
      shouldHaveLabel,
    });

    nonFallbackLabelsCount += labelsManageResult;
  }

  const fallbackActivationValue = configFallback ? getFallbackActivationValue(configFallback) : -1;
  const shouldAddFallbackLabels =
    nonFallbackLabelsCount <= fallbackActivationValue;
  
  log(`Fallback activation value`, fallbackActivationValue)
  log(`Non fallback labels`, nonFallbackLabelsCount)
  log(`should add fallback`, shouldAddFallbackLabels)

  fallbackLabels.forEach(async (labelID) => {
    log(`Adding fallback label ID`, labelID);
    await addRemoveLabel({
      ...commonProps,
      labelID,
      labelName: labelIdToName[labelID],
      shouldHaveLabel: shouldAddFallbackLabels,
    })
  });
};

export const applyPRLabels = async ({
  client,
  config,
  configFallback,
  labelIdToName,
  skipLabeling,
  prContext,
  repo,
}: {
  client: GitHub;
  config: Config['pr'];
  skipLabeling?: string;
  labelIdToName: LabelIDToName;
  configFallback?: Fallback;
  prContext: PRContext;
  repo: Repo;
}) => {
  const { labels: curLabels, prProps, IDNumber } = prContext;

  if (skipLabeling !== undefined && skipLabelingLabelAssigned(curLabels, labelIdToName, skipLabeling)) {
    log({title: 'Skipped', type: 'warn'}, `Labeling skipped due to existing skipLabeling label`);
    return;
  }

  const commonProps = {
    client,
    curLabels,
    IDNumber,
    repo,
  };

  const fallbackLabels = configFallback ? getFallbackLabels(configFallback) : [];
  const fallbackLabelNames = fallbackLabels.map((labelID) => labelIdToName[labelID])
  log(`Fallback labels`, fallbackLabels)

  let nonFallbackLabelsCount = getNonFallbackLabels(curLabels, fallbackLabelNames);
  log(`Init Non Fallback labels count`, nonFallbackLabelsCount)

  for (const [labelID, conditionsConfig] of Object.entries(config)) {
    log(`Processing label ID`, labelID);

    const shouldHaveLabel = evaluator(
      ConditionSetType.pr,
      conditionsConfig,
      prProps,
    );

    const labelsManageResult = await addRemoveLabel({
      ...commonProps,
      labelID,
      labelName: labelIdToName[labelID],
      shouldHaveLabel,
    });

    nonFallbackLabelsCount += labelsManageResult;

    const fallbackActivationValue = configFallback ? getFallbackActivationValue(configFallback) : -1;
    const shouldAddFallbackLabels =
      nonFallbackLabelsCount <= fallbackActivationValue;

    log(`Fallback activation value`, fallbackActivationValue)
    log(`Non fallback labels`, nonFallbackLabelsCount)
    log(`Should add fallback`, shouldAddFallbackLabels)

    fallbackLabels.forEach(async (labelID) => {
      log(`Adding fallback label ID`, labelID);
      await addRemoveLabel({
        ...commonProps,
        labelID,
        labelName: labelIdToName[labelID],
        shouldHaveLabel: shouldAddFallbackLabels,
      })
    });
  }
};