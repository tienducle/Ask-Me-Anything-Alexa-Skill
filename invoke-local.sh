#!/bin/bash
sam build && sam local invoke AskMeAnything --config-file env/local.toml --event docs/samples/events/ama/launch-request-event-trigger.json
