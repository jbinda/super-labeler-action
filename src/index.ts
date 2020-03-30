const github = require('@actions/github');
const core = require('@actions/core');
const path = require('path');

const superLabeler = require('./superLabeler');
const LOCAL_LABELS_FILE = 'labels.local.json';

const { USE_LOCAL_CONFIG, GITHUB_WORKSPACE = '' } = process.env;

const useLocalConfig = USE_LOCAL_CONFIG === 'true';
const showLogs = core.getInput('showLogs');
const configFile = useLocalConfig ? LOCAL_LABELS_FILE : core.getInput('config');

const configPath = path.join(
  GITHUB_WORKSPACE,
  configFile,
);

const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', {
  required: true,
});

const options = {
  configPath,
  showLogs: showLogs === 'true',
};

const action = new superLabeler(new github.GitHub(GITHUB_TOKEN), options);

action.run();
