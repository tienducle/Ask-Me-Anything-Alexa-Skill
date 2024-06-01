import {App} from "../../../src/app.mjs";
import {expect} from "chai";

describe("AskQuestionIntentHandler tests", () => {

    it("verify AskQuestionIntentHandler returns GPT response", async () => {

        const app = new App();
        let trigger = {
            "version": "1.0",
            "session": {
                "new": false,
                "sessionId": "amzn1.echo-api.session.e4cfda26-302e-4fb1-b2e8-65ec7542ec50",
                "application": {
                    "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                },
                "attributes": {},
                "user": {
                    "userId": "amzn1.ask.account.myuserid"
                },
                "affiliatedResources": []
            },
            "context": {
                "Viewport": {
                    "experiences": [
                        {
                            "arcMinuteWidth": 0,
                            "arcMinuteHeight": 0,
                            "canRotate": false,
                            "canResize": false
                        }
                    ],
                    "mode": "MOBILE",
                    "shape": "RECTANGLE",
                    "pixelWidth": 3200,
                    "pixelHeight": 1440,
                    "dpi": 0,
                    "currentPixelWidth": 3200,
                    "currentPixelHeight": 1440,
                    "touch": [
                        "SINGLE"
                    ],
                    "keyboard": [
                        "DIRECTION"
                    ]
                },
                "Extensions": {
                    "available": {}
                },
                "Advertising": {
                    "advertisingId": "00000000-0000-0000-0000-000000000000",
                    "limitAdTracking": true
                },
                "System": {
                    "application": {
                        "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                    },
                    "user": {
                        "userId": "amzn1.ask.account.myuserid"
                    },
                    "device": {
                        "deviceId": "amzn1.ask.device.mydeviceid",
                        "supportedInterfaces": {
                            "Geolocation": {}
                        }
                    },
                    "apiEndpoint": "https://api.eu.amazonalexa.com",
                    "apiAccessToken": "sometoken"
                }
            },
            "request": {
                "type": "IntentRequest",
                "requestId": "amzn1.echo-api.request.b3372b52-7263-4081-99ce-7b99899f0b57",
                "locale": "de-DE",
                "timestamp": "2024-05-25T16:46:23Z",
                "intent": {
                    "name": "AskQuestionIntent",
                    "confirmationStatus": "NONE",
                    "slots": {
                        "fullQuery": {
                            "name": "query",
                            "value": "Wie viel sind 2+2",
                            "resolutions": {
                                "resolutionsPerAuthority": [
                                    {
                                        "authority": "AlexaEntities",
                                        "status": {
                                            "code": "ER_SUCCESS_NO_MATCH"
                                        }
                                    }
                                ]
                            },
                            "confirmationStatus": "NONE",
                            "source": "USER"
                        }
                    }
                }
            }
        }

        let response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("4");

        trigger = {
            "version": "1.0",
            "session": {
                "new": false,
                "sessionId": "amzn1.echo-api.session.e4cfda26-302e-4fb1-b2e8-65ec7542ec50",
                "application": {
                    "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                },
                "attributes": {},
                "user": {
                    "userId": "amzn1.ask.account.myuserid"
                },
                "affiliatedResources": []
            },
            "context": {
                "Viewport": {
                    "experiences": [
                        {
                            "arcMinuteWidth": 0,
                            "arcMinuteHeight": 0,
                            "canRotate": false,
                            "canResize": false
                        }
                    ],
                    "mode": "MOBILE",
                    "shape": "RECTANGLE",
                    "pixelWidth": 3200,
                    "pixelHeight": 1440,
                    "dpi": 0,
                    "currentPixelWidth": 3200,
                    "currentPixelHeight": 1440,
                    "touch": [
                        "SINGLE"
                    ],
                    "keyboard": [
                        "DIRECTION"
                    ]
                },
                "Extensions": {
                    "available": {}
                },
                "Advertising": {
                    "advertisingId": "00000000-0000-0000-0000-000000000000",
                    "limitAdTracking": true
                },
                "System": {
                    "application": {
                        "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                    },
                    "user": {
                        "userId": "amzn1.ask.account.myuserid"
                    },
                    "device": {
                        "deviceId": "amzn1.ask.device.mydeviceid",
                        "supportedInterfaces": {
                            "Geolocation": {}
                        }
                    },
                    "apiEndpoint": "https://api.eu.amazonalexa.com",
                    "apiAccessToken": "sometoken"
                }
            },
            "request": {
                "type": "IntentRequest",
                "requestId": "amzn1.echo-api.request.b3372b52-7263-4081-99ce-7b99899f0b57",
                "locale": "de-DE",
                "timestamp": "2024-05-25T16:46:23Z",
                "intent": {
                    "name": "AskQuestionIntent",
                    "confirmationStatus": "NONE",
                    "slots": {
                        "fullQuery": {
                            "name": "query",
                            "value": "Wie viel sind 15+15",
                            "resolutions": {
                                "resolutionsPerAuthority": [
                                    {
                                        "authority": "AlexaEntities",
                                        "status": {
                                            "code": "ER_SUCCESS_NO_MATCH"
                                        }
                                    }
                                ]
                            },
                            "confirmationStatus": "NONE",
                            "source": "USER"
                        }
                    }
                }
            }
        }

        response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("30");

        trigger = {
            "version": "1.0",
            "session": {
                "new": false,
                "sessionId": "amzn1.echo-api.session.e4cfda26-302e-4fb1-b2e8-65ec7542ec50",
                "application": {
                    "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                },
                "attributes": {},
                "user": {
                    "userId": "amzn1.ask.account.myuserid"
                },
                "affiliatedResources": []
            },
            "context": {
                "Viewport": {
                    "experiences": [
                        {
                            "arcMinuteWidth": 0,
                            "arcMinuteHeight": 0,
                            "canRotate": false,
                            "canResize": false
                        }
                    ],
                    "mode": "MOBILE",
                    "shape": "RECTANGLE",
                    "pixelWidth": 3200,
                    "pixelHeight": 1440,
                    "dpi": 0,
                    "currentPixelWidth": 3200,
                    "currentPixelHeight": 1440,
                    "touch": [
                        "SINGLE"
                    ],
                    "keyboard": [
                        "DIRECTION"
                    ]
                },
                "Extensions": {
                    "available": {}
                },
                "Advertising": {
                    "advertisingId": "00000000-0000-0000-0000-000000000000",
                    "limitAdTracking": true
                },
                "System": {
                    "application": {
                        "applicationId": "amzn1.ask.skill.af36b546-6640-4e26-850d-5f5a7a71eb37"
                    },
                    "user": {
                        "userId": "amzn1.ask.account.myuserid"
                    },
                    "device": {
                        "deviceId": "amzn1.ask.device.mydeviceid",
                        "supportedInterfaces": {
                            "Geolocation": {}
                        }
                    },
                    "apiEndpoint": "https://api.eu.amazonalexa.com",
                    "apiAccessToken": "sometoken"
                }
            },
            "request": {
                "type": "IntentRequest",
                "requestId": "amzn1.echo-api.request.b3372b52-7263-4081-99ce-7b99899f0b57",
                "locale": "de-DE",
                "timestamp": "2024-05-25T16:46:23Z",
                "intent": {
                    "name": "AskQuestionIntent",
                    "confirmationStatus": "NONE",
                    "slots": {
                        "fullQuery": {
                            "name": "query",
                            "value": "Wie viel sind 16+16",
                            "resolutions": {
                                "resolutionsPerAuthority": [
                                    {
                                        "authority": "AlexaEntities",
                                        "status": {
                                            "code": "ER_SUCCESS_NO_MATCH"
                                        }
                                    }
                                ]
                            },
                            "confirmationStatus": "NONE",
                            "source": "USER"
                        }
                    }
                }
            }
        }

        response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("32");
    });

});

