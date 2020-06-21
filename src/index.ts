// MARK: - External dependencies

import * as core from '@actions/core';
import * as github from '@actions/github';
import path from 'path';

import superLabeler from './superLabeler';

const init = () => {

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

export default init()
