import TestCommons from "./test-commons.mjs";
import {expect} from "chai";

describe("AmaBackendApp tests", () => {

    let alexaUserId;
    let hashedAlexaUserId;
    let generatedUsername;
    let generatedUserPassword;
    let userData;
    const apiKey = "some-api-key-to-set-for-test";

    before( async function () {

        await TestCommons.resetEnvironment();
    });

    it("test", async () => {

        const userDataManager = TestCommons.getUserDataManager();

        let createdUsers = []

        for ( let i = 0; i < 10; i++ ) {
            createdUsers.push(TestCommons.createRegisteredUser());
        }

        await Promise.all(createdUsers);

        let allUsers = await userDataManager.getAllUsers();
        let inactiveUsers = await userDataManager.getInactiveUsers();
        expect(allUsers.length).to.equal(10);
        expect(inactiveUsers.length).to.equal(0);

        // Set lastModified of 2 users to be inactive
        const oneDayMillis = 1000 * 60 * 60 * 24;
        TestCommons.updateUserData(allUsers[0], Date.now() - 91 * oneDayMillis);
        TestCommons.updateUserData(allUsers[1], Date.now() - 90 * oneDayMillis);
        TestCommons.updateUserData(allUsers[2], Date.now() - 89 * oneDayMillis);
        TestCommons.updateUserData(allUsers[3], Date.now() - 88 * oneDayMillis);
        TestCommons.updateUserData(allUsers[4], Date.now() - 61 * oneDayMillis);
        TestCommons.updateUserData(allUsers[5], Date.now() - 60 * oneDayMillis);
        TestCommons.updateUserData(allUsers[6], Date.now() - 59 * oneDayMillis);
        TestCommons.updateUserData(allUsers[7], Date.now() - 31 * oneDayMillis);
        TestCommons.updateUserData(allUsers[8], Date.now() - 30 * oneDayMillis);
        TestCommons.updateUserData(allUsers[9], Date.now() - 29 * oneDayMillis);

        // check counts
        allUsers = await userDataManager.getAllUsers();
        inactiveUsers = await userDataManager.getInactiveUsers();
        expect(allUsers.length).to.equal(10);
        expect(inactiveUsers.length).to.equal(2);

        // purge inactive users
        await userDataManager.purgeInactiveUsers();

        // check counts
        allUsers = await userDataManager.getAllUsers();
        inactiveUsers = await userDataManager.getInactiveUsers();
        expect(allUsers.length).to.equal(8);
        expect(inactiveUsers.length).to.equal(0);
    });

});


