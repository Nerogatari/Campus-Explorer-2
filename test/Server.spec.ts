import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";
import { InsightDatasetKind } from "../src/controller/IInsightFacade";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    let SERVER_URL = "http://localhost:4321";
    let ZIP_FILE_DATA: any;
    let ZIP_STRING: any;
    let ZIP_ROOMS_DATA: any;
    let ENDPOINT_URL = "/dataset/coursesZZZ/courses";
    let ROOMS_URL = "/dataset/r00mba/rOOms";

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        Log.test(`Before all`);
        try {
            server.start();
        } catch (err) {
            Log.error(err);
        }
        ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
        ZIP_STRING = ZIP_FILE_DATA.toString("base64");
        ZIP_ROOMS_DATA = fs.readFileSync("./test/data/rooms.zip");
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
        // TODO: stop server here once!
        try {
            server.stop();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        // facade.listDatasets and removing each dataset for each test.
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Sample on how to format PUT requests
    // it("PUT invalid id test for courses dataset", function () {
    //     try {
    //         return chai.request(SERVER_URL)
    //             .put("/dataset/coursesZZZ_to/courses")
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 Log.info(res.text);
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 // some logging here please!
    //                 Log.info(err.message);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //     }
    // });

    // it("PUT test for courses dataset", function () {
    //     try {
    //         return chai.request(SERVER_URL)
    //             .put(ENDPOINT_URL)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 Log.info(res.text);
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 // some logging here please!
    //                 Log.info(err.message);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //     }
    // });

    // it("PUT test for courses dataset", function () {
    //     try {
    //         return chai.request(SERVER_URL)
    //             .put(ROOMS_URL)
    //             .send(ZIP_ROOMS_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 Log.info(res.text);
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 // some logging here please!
    //                 Log.info(err.message);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //     }
    // });

    // it("DEL test for rooms dataset", function () {
    //     // facade.addDataset("coursesss", ZIP_STRING, InsightDatasetKind.Courses).then(() => {
    //         try {
    //             return chai.request(SERVER_URL)
    //                 .del("/dataset/coursesss")
    //                 .then(function (res: Response) {
    //                     // some logging here please!
    //                     Log.info(res.text);
    //                     expect(res.status).to.be.equal(200);
    //                 })
    //                 .catch(function (err) {
    //                     // some logging here please!
    //                     Log.info(err.message);
    //                     expect.fail();
    //                 });
    //         } catch (err) {
    //             // and some more logging here!
    //         }
    //     // });
    // });

    // it("list test for courses dataset", function () {
    //     try {
    //         return chai.request(SERVER_URL)
    //             .get("/datasets")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 Log.info(res.text);
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 // some logging here please!
    //                 Log.info(err.message);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //     }
    // });

    // it("test for echo", function () {
    //     try {
    //         return chai.request("http://localhost:4321")
    //             .get("/echo/helllloooo")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 // some logging here please!
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //     }
    // });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
