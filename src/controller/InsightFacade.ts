import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import DatasetHelper from "./DatasetHelpers";
import AddDatasetHelper from "./AddDatasetHelpers";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
import PerformQueryHelper from "./performQueryHelper";
import * as fs from "fs";
import * as parse5 from "parse5";
export default class InsightFacade implements IInsightFacade {
    private addedMapsArr: any[];
    private datasetHelper: DatasetHelper;
    private addDatasetHelper: AddDatasetHelper;
    constructor() {
        this.datasetHelper = new DatasetHelper();
        this.addDatasetHelper = new AddDatasetHelper();
        this.addedMapsArr = [];
        this.loadDiskDatasets();
        Log.trace("InsightFacadeImpl::init()");
    }
    // https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    // https://stuk.github.io/jszip/documentation/examples.html
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetArray: string[] = [];
        let addedIds: string[] = [];
        if (this.datasetHelper.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === true) {
            return Promise.reject(new InsightError("Existing ID"));
        } // TODO check weird, illformed files, weird courses structure
        let promisesArr: Array<Promise<string>> = [];
        let promisesArr2: Array<Promise<any>> = [];
        if (kind === InsightDatasetKind.Rooms) {
            return this.addRoomsDataset(id, content, kind);
        }
        if (kind === InsightDatasetKind.Courses) {
            // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
            let fileName: string = "";
            return newZip.loadAsync(content, { base64: true }).then((zip: any) => {
                zip.folder("courses").forEach(function (relativePath: any, filee: any) {
                    fileName = filee.name.replace("courses/", "");
                    if (fileName === ".DS_Store") {
                        return;
                    }
                    promisesArr.push(filee.async("string"));
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
                    });
            }).then(() => {
                this.writeToDisk(id, kind, dataSetArray, addedIds);
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

    private addRoomsDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let outtieZip: any;
        let promisesArr: Array<Promise<string>> = [];
        let promisesArr2: Array<Promise<any>> = [];
        let dataSetArray: string[] = [];
        let addedIds: string[] = [];
        return newZip.loadAsync(content, { base64: true })
                .then((zip: any) => {
                    let unzip = zip.folder("rooms");
                    outtieZip = zip;
                    let index = this.addDatasetHelper.filterIndex(unzip);
                    if (index.length < 1) {
                        return Promise.reject(new InsightError("No index for Rooms"));
                    }
                    return index[0].async("string");
                })
                .then((indexData: any) => {
                        return this.addDatasetHelper.parseIndex(indexData);
                })
                .then((bldgsPaths: any) => {
                    for (const path of bldgsPaths) {
                        promisesArr.push(outtieZip.file(path.replace(".", "rooms")).async("string"));
                    }
                })
                .then(() => {
                    return Promise.all(promisesArr);
                })
                .then((fileData: any) => {
                    for (const data of fileData) {
                        let res = parse5.parse(data);
                        promisesArr2.push(this.datasetHelper.parseBuilding(res));
                    }
                })
                .then(() => {
                    return Promise.all(promisesArr2);
                })
                .then((roomsAll) => {
                    for (const rooms of roomsAll) {
                        dataSetArray.push(...rooms);
                    }
                })
                .then(() => {
                    this.writeToDisk(id, kind, dataSetArray, addedIds);
                    return addedIds;
                })
                .catch((err) => {
                    return Promise.reject(new InsightError(err));
                });
    }
    private writeToDisk(id: string, kind: InsightDatasetKind, dataSetArray: string[], addedIds: string[]) {
        let newObj: any = { id: id, kind: kind, data: dataSetArray };
        const str = JSON.stringify(newObj);
        writeFileSync("./data/" + id + ".txt", str);
        this.addedMapsArr.push(newObj);
        // Log.info(dataSetArray);
        this.addedMapsArr.forEach((ele: any) => {
            addedIds.push(ele.id);
        });
    }

}
