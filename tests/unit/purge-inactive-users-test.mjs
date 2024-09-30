import TestCommons from "./test-commons.mjs";
import {expect} from "chai";

describe("AmaBackendApp tests", () => {

    before( async function () {
        await TestCommons.resetEnvironment();
    });

    it("validate that data of inactive users are purged", async () => {

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
        const now = Date.now();
        await TestCommons.updateUserData(allUsers[0], now - 91 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[1], now - 90 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[2], now - 89 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[3], now - 88 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[4], now - 61 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[5], now - 60 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[6], now - 59 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[7], now - 31 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[8], now - 30 * oneDayMillis);
        await TestCommons.updateUserData(allUsers[9], now - 29 * oneDayMillis);

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


