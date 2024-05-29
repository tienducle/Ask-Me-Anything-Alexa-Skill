#!/bin/bash
sam build && sam local invoke --config-file env/local.toml --event events/launch-request-event-trigger.json
