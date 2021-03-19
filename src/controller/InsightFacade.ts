import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import DatasetHelper from "./DatasetHelpers";
import AddDatasetHelper from "./AddDatasetHelpers";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
import * as fs from "fs";
import * as parse5 from "parse5";
import * as PerformFilter from "./PerformFilter";
import { performTransform } from "./PerformTransform";
import {isArray, isObject, isString} from "util";
import {sortOrder, sortTransform} from "./SortHelper";
import {orderHelper, performSelect, validQuery} from "./QueryHelper";
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
        if (!validQuery(query)) {
            return Promise.reject(new InsightError("Invalid query!"));
        }
        let filter = query.WHERE;  // TODO check query missing where, missing options, more than 2 fields
        let datasetID = query.OPTIONS.COLUMNS[0].split("_")[0];
        let sections = this.getDatasetById(datasetID); // let section store dataset id
        let dataKind = this.getKindById(datasetID);
        let transform = query.TRANSFORMATIONS;
        let sortedSections: any[];
        let filteredSections = []; // applied filter sections
        let transformedSection;
        try {
            if (!Object.keys(filter)) {
                filteredSections = sections;
            } else if (Object.keys(filter).length <= 1) {
                // pass dataset and filter and return sections
                let columns = query.OPTIONS.COLUMNS;
                filteredSections = PerformFilter.performFilter(sections, filter, datasetID, dataKind);
                if (transform) {
                    transformedSection = performTransform(filteredSections, transform, datasetID);
                } else {
                    transformedSection = filteredSections;
                }
                let selectedSections = performSelect(transformedSection, columns, query);
                if ("ORDER" in query.OPTIONS) {
                    const orderKey = query.OPTIONS.ORDER;
                    sortedSections = orderHelper(orderKey, selectedSections, query);
                } else {
                    sortedSections = selectedSections;
                }
                if (sortedSections.length > 5000) {
                    throw new ResultTooLargeError("Result exceeds 5000");
                } else {
                    return Promise.resolve(sortedSections);
                }
            } else {
                return Promise.reject(new InsightError(("More than one filter in WHERE")));
            }
        } catch (e) {
            return Promise.reject(e);
        }
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

    private getKindById(id: string): any {
        let fileKind: any = "";
        fs.readdirSync("./data/").forEach((filename) => {
            if (id === filename.split(".")[0]) {
                const fileContent = fs.readFileSync("./data/" + filename, "utf8");
                fileKind = JSON.parse(fileContent).kind;
            }
        });
        if (fileKind === []) {
            throw new InsightError("Nothing in dataset");
        } else {
            return fileKind;
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
