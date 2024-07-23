#!/bin/bash
sam build && sam local invoke --config-file env/local.toml --event docs/samples/events/launch-request-event-trigger.json
