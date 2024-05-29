#!/bin/bash
sam build && AWS_PROFILE=pinguincloud-tle sam deploy --config-file env/production.toml "$@"
