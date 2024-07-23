import {AmaApp} from "../../../src/ama-app.mjs";
import {expect} from "chai";

describe("LaunchRequestHandler tests", () => {

    it("verify LaunchRequestHandler returns English welcome message", async () => {

        const app = new AmaApp();
        const trigger = {
            "version": "1.0",
            "session": {
                "new": true,
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
                "type": "LaunchRequest",
                "requestId": "amzn1.echo-api.request.acf3845e-c664-4564-a88b-3471f139c8d2",
                "locale": "en-US",
                "timestamp": "2024-05-25T16:46:18Z",
                "shouldLinkResultBeReturned": false
            }
        }

        const response = await app.handle(trigger);
        expect(response.response.outputSpeech.ssml).to.equal("<speak>Welcome to the Online Lexicon.</speak>");
    });

    it("verify LaunchRequestHandler returns German welcome message", async () => {

        const app = new AmaApp();
        const trigger = {
            "version": "1.0",
            "session": {
                "new": true,
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
                "type": "LaunchRequest",
                "requestId": "amzn1.echo-api.request.acf3845e-c664-4564-a88b-3471f139c8d2",
                "locale": "de-DE",
                "timestamp": "2024-05-25T16:46:18Z",
                "shouldLinkResultBeReturned": false
            }
        }

        const response = await app.handle(trigger);
        expect(response.response.outputSpeech.ssml).to.equal("<speak>Willkommen beim Online Lexikon.</speak>");
    });

    it("verify LaunchRequestHandler returns default welcome message", async () => {

        const app = new AmaApp();
        const trigger = {
            "version": "1.0",
            "session": {
                "new": true,
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
                "type": "LaunchRequest",
                "requestId": "amzn1.echo-api.request.acf3845e-c664-4564-a88b-3471f139c8d2",
                "locale": "unknown-language",
                "timestamp": "2024-05-25T16:46:18Z",
                "shouldLinkResultBeReturned": false
            }
        }

        const response = await app.handle(trigger);
        expect(response.response.outputSpeech.ssml).to.equal("<speak>Welcome to the Online Lexicon.</speak>");
    });

});

