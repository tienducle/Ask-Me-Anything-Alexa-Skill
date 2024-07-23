#!/bin/bash
npm run tests-with-coverage && sam build && AWS_PROFILE=pinguincloud-tle sam deploy --config-file env/production.toml "$@"
