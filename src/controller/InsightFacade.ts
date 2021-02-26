import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import DatasetHelper from "./DatasetHelpers";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
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

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
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