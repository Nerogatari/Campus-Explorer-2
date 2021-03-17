// eslint-disable-next-line max-lines
// eslint-disable-next-line max-lines
import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import DatasetHelper from "./DatasetHelpers";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
import PerformQueryHelper from "./performQueryHelper";
import * as fs from "fs";
import * as PerformFilter from "./PerformFilter";
import { performTransform } from "./PerformTransform";
// import * as fse from "fs-extra";
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
        if (kind === InsightDatasetKind.Rooms) {
            return Promise.reject(new InsightError("Invalid Kind"));
        }
        if (this.datasetHelper.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === true) {
            return Promise.reject(new InsightError("Existing ID"));
        } // TODO check weird, illformed files, weird courses structure
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
                    let newObj: any = {id: id, kind: kind, data: dataSetArray};
                    const str = JSON.stringify(newObj);
                    writeFileSync("./data/" + id + ".txt", str);
                    this.addedMapsArr.push(newObj);
                    Log.info("Good push"); // return something
                });
        }).then(() => {
            Log.info("MORE SUCCESS");
            this.addedMapsArr.forEach((ele: any) => {
                addedIds.push(ele.id);
            });
            return addedIds;
        })
            .catch((err) => {
                Log.info("UH oH");
                return Promise.reject(new InsightError(err));
            });
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

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public performQuery(query: any): Promise<any[]> {
        if (!this.validQuery(query)) {
            return Promise.reject(new InsightError("Invalid query!"));
        }
        try {
            let filter = query.WHERE;  // TODO check query missing where, missing options, more than 2 fields
            let datasetID = query.OPTIONS.COLUMNS[0].split("_")[0];
            let sections = this.getDatasetById(datasetID); // let section store dataset id
            let transform = query.TRANSFORMATIONS;
            let filteredSections = []; // applied filter sections
            if (!Object.keys(filter)) {
                filteredSections = sections;
            } else if (Object.keys(filter).length === 1) {
                // pass dataset and filter and return sections
                filteredSections = PerformFilter.performFilter(sections, filter, datasetID);
                let transformedSections = performTransform(filteredSections, transform, datasetID);
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
                let sortedSections: [];
                if (typeof orderKey === "string") {
                    sortedSections = transformedSections.sort((obj1: any, obj2: any) => {
                        if (obj1[orderKey] > obj2[orderKey]) {
                           return 1;
                        } else if (obj1[orderKey] < obj2[orderKey]) {
                        return -1;
                        }
                        return 0;
                    });
                } else {
                    sortedSections = transformedSections.sort((obj1: any, obj2: any) => {
                        for (let key of orderKey.keys) {
                            if (obj1[key] !== obj2[key]) {
                                if (orderKey.dir === "UP") {
                                    if (obj1[key] > obj2[key]) {
                                        return 1;
                                    } else if (obj1[key] < obj2[key]) {
                                        return -1;
                                    }
                                } else if (orderKey.dir === "DOWN") {
                                    if (obj1[key] > obj2[key]) {
                                        return -1;
                                    } else if (obj1[key] < obj2[key]) {
                                        return 1;
                                    }
                                }
                            }
                        }
                        // return 0;
                    });
                }
                // console.log(sortedSections);
                if (sortedSections.length <= 5000) {
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
        // let length: number = Object.keys(query).length;
        // if (!("WHERE" in query)) {
        //     return false;
        // }
        // if (!("OPTIONS" in query)) {
        //     return false;
        // }
        // if (Object.keys(query.OPTIONS).length > 2) {
        //     return false;
        // }
        // if (!(length === 2)) {
        //     return false;
        // }
        // if (!("COLUMNS" in query.OPTIONS)) {
        //     return false;
        // }
        // if ("ORDER" in query) {
        //     return query.OPTIONS["COLUMNS"].includes(["ORDER"]);
        // }
        // let columns: any[] = query.OPTIONS["COLUMNS"];
        // return columns.length !== 0;
        // //  TODO sorting when order is empty?
        return true; // remove this
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
        readdir("./data/", (err: any, filenames: any)  => {
            if (err) {
                Log.info("Failed directory read");
                return;
            }
            filenames.forEach( (filename: any) => {
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

}
