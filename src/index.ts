const init = () => {
  // MARK: - External dependencies
  const github = require('@actions/github');
  const core = require('@actions/core');
  const path = require('path');

  const superLabeler = require('./superLabeler');

  const { GITHUB_WORKSPACE = '' } = process.env;

  const configFile =  core.getInput('config');

  const configPath = path.join(
    GITHUB_WORKSPACE,
    configFile,
  );

  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', {
    required: true,
  });

  const options = {
    configPath
  };

  return new superLabeler(new github.GitHub(GITHUB_TOKEN), options);
}

module.exports = init()
