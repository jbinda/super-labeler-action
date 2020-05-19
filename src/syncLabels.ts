import * as core from '@actions/core';
import { GitHub } from '@actions/github';

import { Config } from './types';
import { createLabel, getLabels, Repo, updateLabel } from './api';
import { formatColour, log } from './utils';

const syncLabels = async ({
  client,
  config,
  repo,
}: {
  client: GitHub;
  config: Config['labels'];
  repo: Repo;
}) => {
  const curLabels = await getLabels({ client, repo });
  log(`Repo current labels`, curLabels);

  for (const _configLabel of Object.values(config)) {
    const configLabel = {
      ..._configLabel,
      color: _configLabel.colour,
    };

    const curLabel = curLabels.filter((l) => l.name === configLabel.name);
    if (curLabel.length > 0) {
      const label = curLabel[0];
      if (
        label.description !== configLabel.description ||
        label.color !== formatColour(configLabel.color)
      ) {
        log({title: `Recreate label`, type: 'action'}, {newLabelData: configLabel, prevLabelData: label})
        try {
          await updateLabel({ client, repo, label: configLabel });
        }
        catch(e) {
          log({title:'Label update error', type: 'error'}, e.message )
          core.error(`Label update error: ${e.message}`)
        }
      }
    } else {
      log({title: `Create label`, type: 'action'}, configLabel)
      try {
        await createLabel({ client, repo, label: configLabel });
      }
      catch (e) {
        log({title:'Label create error', type: 'error'}, e.message )
        core.error(`Label create error: ${e.message}`)
      }
    }
  }
};

export default syncLabels;
