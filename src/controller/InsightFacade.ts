import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import DatasetHelper from "./DatasetHelpers";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
import PerformQueryHelper from "./performQueryHelper";
import * as fs from "fs";
import * as parse5 from "parse5";
import * as http from "http";
export default class InsightFacade implements IInsightFacade {
    private addedMapsArr: any[];
    private datasetHelper: DatasetHelper;
    constructor() {
        this.datasetHelper = new DatasetHelper();
        this.addedMapsArr = [];
        this.loadDiskDatasets();
        Log.trace("InsightFacadeImpl::init()");
    }
    // https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    // https://stuk.github.io/jszip/documentation/examples.html
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetArray: string[] = [];
        let fileName: string = "";
        let addedIds: string[] = [];
        if (this.datasetHelper.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === true) {
            return Promise.reject(new InsightError("Existing ID"));
        } // TODO check weird, illformed files, weird courses structure  
        if (kind === InsightDatasetKind.Rooms) {
            // validateRooms()
            // return newZip.loadAsync(content, { base64: true }).then((zip: any) => {
            //     let stuff = zip.folder("rooms");
            //     let promisesArr: Array<Promise<string>> = [];

            //     stuff.forEach((relativePath: any, file: any) => {
            //         fileName = file.name.replace("rooms/", "");
            //         if (fileName === "index.htm") {
            //             file.async("string").then((indexData: any) => {
            //                 this.parseIndex(indexData).then((bldgsPaths: any) => {
            //                     for (const path of bldgsPaths) {
            //                         let rootPath = path.replace(".", "rooms");
            //                         zip.file(rootPath).async("string").then((fileData: any) => {
            //                             let res = parse5.parse(fileData);
            //                             this.parseBuilding(res).then((rooms) => {
            //                                 dataSetArray.push(...rooms);
            //                             });
            //                         });
            //                     }
            //                 });
            //             });
            //         }
            //     });
            let outtieZip: any;
            return newZip.loadAsync(content, { base64: true })
                .then((zip: any) => {
                    let stuff = zip.folder("rooms");
                    let promisesArr: Array<Promise<string>> = [];
                    outtieZip = zip;
                    stuff.forEach((relativePath: any, file: any) => {
                        fileName = file.name.replace("rooms/", "");
                        if (fileName === "index.htm") {
                            // return file.async("string");
                            return "no";
                        }
                    });
                })
                .then((indexData: any) => {
                        return this.parseIndex(indexData);
                })
                .then((bldgsPaths: any) => {
                    for (const path of bldgsPaths) {
                        let rootPath = path.replace(".", "rooms");
                        return outtieZip.file(rootPath).async("string");
                    }
                })
                .then((fileData: any) => {
                    let res = parse5.parse(fileData);
                    return this.parseBuilding(res);
                })
                .then((rooms) => {
                    dataSetArray.push(...rooms);
                })
                    // stuff.filter((file: any) =>
                    // fileName = file.name.replace("rooms/", "");
                    // if (fileName === "index.htm") {
                    //     file.async("string").then((indexData: any) => {
                    //         this.parseIndex(indexData).then((bldgsPaths) => {
                    //             for (const path of bldgsPaths) {
                    //                 let fileData = zip.file(path).async("string");
                    //                 Log.info(fileData);
                    //             }
                    //         })
                    //     });
                    // }
            
                // return Promise.all(promisesArr).then((indexData: any) => {
                //     this.parseIndex(indexData).then((bldgsPaths) => {
                //         for (const bldg of bldgsPaths) {
                //             let path = bldg.replace(".", "./test/data/rooms");
                //             let fileData = readFileSync(path).toString();
                //             // this.parseHTML(String(content)).then((parsedData: any) => {
                //             //     Log.info(parsedData);
                //             // })
                //             let res = parse5.parse(fileData);
                //             this.parseBuilding(res).then((rooms) => {
                //                 dataSetArray.push(...rooms);
                //                 }
                //             );
                //             // let temp = this.parseBuilding(res);
                //             // dataSetArray.push(...temp);
                //         }
                //     });
                // });
            .then(() => {
                Log.info("MORE SUCCESS");
                this.addedMapsArr.forEach((ele: any) => {
                    addedIds.push(ele.id);
                });
                return addedIds;
            })
                .catch((err) => {
                    return Promise.reject(new InsightError(err));
                });
        }
        if (kind === InsightDatasetKind.Courses) {
            // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
            return newZip.loadAsync(content, { base64: true }).then((zip: any) => {
                let promisesArr: Array<Promise<string>> = [];
                zip.folder("courses").forEach(function (relativePath: any, file: any) {
                    fileName = file.name.replace("courses/", "");
                    if (fileName === ".DS_Store") {
                        return;
                    }
                    promisesArr.push(file.async("string"));
                });
                return Promise.all(promisesArr)
                    .then((sectionData: any) => {
                        let tempArr = [];
                        for (const section of sectionData) {
                            tempArr = this.datasetHelper.parseCourseData(id, section);
                            dataSetArray.push(...tempArr);
                        }
                        if (dataSetArray.length === 0) {
                            return Promise.reject(new InsightError("No valid sections in file"));
                        }
                        let newObj: any = { id: id, kind: kind, data: dataSetArray };
                        const str = JSON.stringify(newObj);
                        writeFileSync("./data/" + id + ".txt", str);
                        this.addedMapsArr.push(newObj);
                    });
            }).then(() => {
                Log.info("MORE SUCCESS");
                this.addedMapsArr.forEach((ele: any) => {
                    addedIds.push(ele.id);
                });
                return addedIds;
            })
                .catch((err) => {
                    return Promise.reject(new InsightError(err));
                });
        }
    }

    public removeDataset(id: string): Promise<string> {
        let removedId = "";
        if (this.datasetHelper.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === false) {
            return Promise.reject(new NotFoundError("ID not loaded"));
        }
        for (let i = 0; i < this.addedMapsArr.length; i++) {
            if (this.addedMapsArr[i].id === id) {
                this.addedMapsArr.splice(i, 1);
                removedId = id;
            }
        }
        unlinkSync("./data/" + id + ".txt");
        return Promise.resolve(removedId);
        // use unlink for async TODO if running time too long
    }

    public performQuery(query: any): Promise<any[]> {
        try {
            if (!this.validQuery(query)) {
                return Promise.reject(new InsightError("Invalid query"));
            }
            let filter = query.WHERE;  // TODO check query missing where, missing options, more than 2 fields
            let datasetID = query.OPTIONS.COLUMNS[0].split("_")[0];
            let sections = this.getDatasetById(datasetID); // let section store dataset id
            let filteredSections = []; // applied filter sections
            if (!Object.keys(filter)) {
                filteredSections = sections;
            } else if (Object.keys(filter).length === 1) {
                // pass dataset and filter and return sections
                filteredSections = this.performFilter(sections, filter, datasetID);
                let columns = query.OPTIONS.COLUMNS;
                let selectedSections = filteredSections.map((section: any) => {
                    let newSection: any = {};
                    columns.forEach((key: string) => {
                        if (key.indexOf("_") !== -1) {
                            newSection[key] = section[key];
                            if (!key === query.OPTIONS.COLUMNS[0]) {
                                return Promise.reject(new InsightError("Cross dataset"));
                            }
                        } else {
                            return Promise.reject("columns key does not contain _");
                        }
                    });
                    return newSection;
                });
                const orderKey = query.OPTIONS.ORDER;
                let sortedSections = selectedSections.sort((obj1, obj2) => {
                    if (obj1[orderKey] > obj2[orderKey]) {
                        return 1;
                    }
                    if (obj1[orderKey] < obj2[orderKey]) {
                        return -1;
                    }
                    return 0;
                });
                // TODO check length >5000
                if (sortedSections.length < 5000) {
                    return Promise.resolve(sortedSections);
                } else {
                    return Promise.reject(new ResultTooLargeError("length > 5000")); // TODO check whr
                    // throw new ResultTooLargeError("length > 5000");
                }
            } else {
                return Promise.reject(new InsightError(("More than one filter in WHERE")));
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }
    private validQuery(query: any): boolean {
        let length: number = Object.keys(query).length;
        if (!("WHERE" in query)) {
            return false;
        }
        if (!("OPTIONS" in query)) {
            return false;
        }
        if (Object.keys(query.OPTIONS).length > 2) {
            return false;
        }
        if (!(length === 2)) {
            return false;
        }
        if (!("COLUMNS" in query.OPTIONS)) {
            return false;
        }
        if ("ORDER" in query) {
            return query.OPTIONS["COLUMNS"].includes(["ORDER"]);
        }
        let columns: any[] = query.OPTIONS["COLUMNS"];
        return columns.length !== 0;
    }
    private getDatasetById(id: string): any[] {
        let retval: any[] = [];
        fs.readdirSync("./data/").forEach((filename) => {
            // read file sync return array.
            if (id === filename.split(".")[0]) {
                const fileContent = fs.readFileSync("./data/" + filename, "utf8");
                let fileID = JSON.parse(fileContent).id; // REVIVER
                if (fileID === id) {
                    retval = JSON.parse(fileContent).data;
                }
            }
        });
        if (retval === []) {
            throw new InsightError("Nothing in dataset");
        } else {
            return retval;
        }
    }
    // check lists for Rooms counting rows
    public listDatasets(): Promise<InsightDataset[]> {
        let emptyList: InsightDataset[] = [];
        for (const ele of this.addedMapsArr) {
            let obj: InsightDataset = {
                id: ele.id, kind: ele.kind, numRows: ele.data.length
            };
            emptyList.push(obj);
        }
        return Promise.resolve(emptyList);
    }
    // should stay
    private existingDatasetID(id: string): boolean {
        let bool: boolean = false;
        bool = this.addedMapsArr.some((ele) => {
            return ele.id === id;
        });
        return bool;
    }
    // https://medium.com/stackfame/get-list-of-all-files-in-a-directory-in-node-js-befd31677ec5
    private loadDiskDatasets = () => {
        readdir("./data/", (err: any, filenames: any) => {
            if (err) {
                Log.info("Failed directory read");
                return;
            }
            filenames.forEach((filename: any) => {
                if (filename === ".DS_Store") {
                    return;
                }
                let data = JSON.parse(readFileSync("./data/" + filename).toString());
                if (this.existingDatasetID(data.id) === true) {
                    Log.warn("Skipped loading id:" + data.id + ", due to already existing id");
                    return;
                }
                this.addedMapsArr.push(data);
            });
        });
    }


    private performFilter(sections: object[], filter: object, id: string): object[] {

        let retval = sections.filter((section) => {
            return this.isSatisfied(section, filter, id);
        });
        return retval;

    }

    private isSatisfied(section: any, filter: any, id: string): boolean {
        let helper = new PerformQueryHelper();
        let operationArr: any[] = Object.keys(filter);
        let filterArr: any[] = filter[operationArr[0]];
        if (operationArr.length === 0) {
            // return true;
            throw new InsightError("Number of filter key should  not be 0");
        } else if (operationArr.length > 1) {
            throw new InsightError("Number of filter key is greater than 1");
        } else {
            switch (operationArr[0]) {
                case "NOT":
                    return !this.isSatisfied(section, filter.NOT, id);

                case "AND": // TODO: check empty array
                    if (filterArr.length === 0 || filter.AND === 0) {
                        throw new InsightError("empty array");
                    }
                    let resultAND = true;
                    for (let obj of filter.AND) {
                        if (this.isSatisfied(section, obj, id) === false) {
                            resultAND = false;
                        }
                    }
                    return resultAND;
                case "OR":
                    if (filterArr.length === 0) {
                        throw new InsightError("empty array");
                    }
                    let resultOR = false;
                    for (let obj of filter.OR) {
                        if (this.isSatisfied(section, obj, id) === true) {
                            resultOR = true;
                        }
                    }
                    return resultOR;
                case "IS":
                    return helper.IScomparator(filter, section, id);
                case "LT":
                    return helper.LTcomparator(filter, section, id);
                case "GT":
                    return helper.GTcomparator(filter, section, id);
                case "EQ":
                    return helper.EQcomparator(filter, section, id);
                default:
                    throw new InsightError("Invalid comparator name");

            }
        }
    }

    private async parseIndex(content: string): Promise<string[]> {
        let bldgsArr: string[] = [];
        return this.parseHTML(String(content)).then((parsedData: any) => {
            bldgsArr = this.findBuildings(parsedData);
            return Promise.resolve(bldgsArr);
        });
    }
    // https://github.students.cs.ubc.ca/falkirks/c2_parsing/blob/master/src/MemeViewer.ts
    private parseHTML(html: string): Promise<any> {
        return Promise.resolve(parse5.parse(html));
    }
    // https://medium.com/swlh/depth-first-and-breadth-first-dom-traversal-explained-for-real-86244fbf9854
    private findBuildings(element: any): string[] {
        let bldgs: string[] = [];
        let stack = [];
        stack.push(element);

        while (stack.length > 0) {
            let curr = stack.pop();
            if (curr.nodeName === "a" && curr.attrs.filter((e: any) => e.name === "title"
                && e.value === "Building Details and Map").length > 0) {
                let str = curr.attrs[0].value;
                if (bldgs.indexOf(str) === -1) {
                    bldgs.push(str);
                }
                // bldgs.push(str.replace("\n", "").trim());
            }
            if (curr.childNodes) {
                curr.childNodes?.reverse().forEach((child: any) => {
                    stack.push(child);
                });
            }
        }
        return bldgs;
    }

    private parseBuilding(element: any): Promise<any[]> {
        let buildingInfo: any = {};
        let bldgsRoomsArr: any[] = [];
        let stack: any[] = [];
        stack.push(element);

        while (stack.length > 0) {
            let curr = stack.pop();
            if (curr.nodeName === "div" && curr.attrs.filter((e: any) => e.name === "id"
                && e.value === "building-info").length > 0) {
                if (curr.childNodes[1] && curr.childNodes[1].childNodes && curr.childNodes[1].childNodes[0].nodeName === "span") {
                    buildingInfo["fullname"] = curr.childNodes[1].childNodes[0].childNodes[0].value;
                }

                if (curr.childNodes[3] && curr.childNodes[3].attrs.filter((e: any) => e.value === "building-field").length > 0) {
                    buildingInfo["address"] = curr.childNodes[3].childNodes[0].childNodes[0].value;
                }
            }
            if (curr.nodeName === "link" && curr.attrs.filter((e: any) => e.name === "rel"
                && e.value === "canonical").length > 0 &&
                curr.attrs.filter((e: any) => e.name === "href").length > 0) {
                buildingInfo["shortname"] = curr.attrs[1].value;
            }

            if (curr.nodeName === "tbody") {
                for (const child of curr.childNodes) {
                    let roomsInfo: any = {};
                    if (child.nodeName === "tr") {
                        for (const innerChild of child.childNodes) {
                            if (innerChild.attrs && innerChild.attrs[0].value === "views-field views-field-field-room-number") {
                                if (innerChild.childNodes[1].attrs[0].name === "href") {
                                    roomsInfo["rooms_href"] = innerChild.childNodes[1].attrs[0].value;
                                    roomsInfo["rooms_number"] = innerChild.childNodes[1].childNodes[0].value;
                                }
                            }
                            if (innerChild.attrs && innerChild.attrs[0].value === "views-field views-field-field-room-capacity") {
                                roomsInfo["rooms_seats"] = innerChild.childNodes[0].value.replace("\n", "").trim();
                            }
                            if (innerChild.attrs && innerChild.attrs[0].value === "views-field views-field-field-room-furniture") {
                                roomsInfo["rooms_furniture"] = innerChild.childNodes[0].value.replace("\n", "").trim();
                            }
                            if (innerChild.attrs && innerChild.attrs[0].value === "views-field views-field-field-room-type") {
                                roomsInfo["rooms_type"] = innerChild.childNodes[0].value.replace("\n", "").trim();
                            }
                        }
                    }
                    if (Object.keys(roomsInfo).length > 0) {
                        // check fields and enforce types
                        roomsInfo["rooms_fullname"] = buildingInfo["fullname"];
                        roomsInfo["rooms_shortname"] = buildingInfo["shortname"];
                        roomsInfo["rooms_name"] = buildingInfo["shortname"] + "_" + roomsInfo["rooms_number"];
                        bldgsRoomsArr.push(roomsInfo);
                    }
                }
            }
            if (curr.childNodes) {
                curr.childNodes?.reverse().forEach((child: any) => {
                    stack.push(child);
                });
            }
        }
        if (bldgsRoomsArr.length > 0) {
            this.requestLatLon(buildingInfo["address"]).then((latlon: any) => {
                Log.info(latlon);
                bldgsRoomsArr.forEach((room) => {
                    room["rooms_lat"] = latlon["lat"];
                    room["rooms_lon"] = latlon["lon"];
                });
                return Promise.resolve(bldgsRoomsArr);
            });
        } else {
            return Promise.resolve(bldgsRoomsArr);
        }
    }
    // https://stackoverflow.com/questions/19539391/how-to-get-data-out-of-a-node-js-http-get-request
    // https://stackoverflow.com/questions/38533580/nodejs-how-to-promisify-http-request-reject-got-called-two-times
    private requestLatLon(address: string): Promise<any> {
        let path = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team226/";
        let reqAdd = address.replace(/ /g, "%20");
        path = path + reqAdd;
        return new Promise((resolve, reject) => {
            let req = http.get(path, (res) => {
                Log.info("inside request");
                const { statusCode } = res;
                let error;
                if (statusCode !== 200) {
                    return reject(new Error("Bad request"));
                }
                let rawData = "";
                let parsedData: any;
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        parsedData = JSON.parse(rawData);
                    } catch (e) {
                        reject(e.message);
                    }
                    resolve(parsedData);
                });
            });
            req.on("error", (err) => {
                reject(err);
            });
            req.end();
        });
    }
}
