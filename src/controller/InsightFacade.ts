import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import { strict } from "assert";
// import * as fse from "fs-extra";
const fse = require('fs-extra');

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    addedMap = new Map(); // global variable thing TOASK4
    constructor() {
        const fs = require('fs');
        function reviver(key: any, value: any) {
            if(typeof value === 'object' && value !== null) {
              if (value.dataType === 'Map') {
                return new Map(value.value);
              }
            }
            return value;
        }
        // this.addedMap = this.loadDiskDatasets();
        Log.trace("InsightFacadeImpl::init()");
    }

    // public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
    //     let newZip = new JSZip();
    //     let dataSetMap = new Map();
    //     // if (this.validId(id) === false) {
    //     //     Promise.reject(new InsightError());
    //     // }
        
    //     // https://stuk.github.io/jszip/documentation/examples.html
    //     // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
    //     // dir is true and assume id is correct (private helpers?), need to store types (TOASKNEW3)
    //     newZip.loadAsync(content, { base64: true }).then(function (zip: any) {
    //         let promisesArr = [Promise];
    //         zip.folder("courses").forEach(function (relativePath: any, file: any) {
    //             let name = file.name.replace("courses/", "");
    //             promisesArr.push(file.async("string").then(function (content: any) {
    //                 // parseCourseData(content).then(function (courseData: any) {
    //                 dataSetMap.set(name, content);
    //                 // ?? name async ? JSONPARSE
    //                 // } use a class for getting right fields? (TOASK2)
    //                 // ...then
    //             })
    //             )
    //         });
    //         Promise.all(promisesArr)
    //             .catch(return Promise.reject("Not implemented."));
    //     }).then(() => {
    //         // let newCourses = newZip.folder("courses"); Promise.all (TOASK1)
    //         // let testMap = new Map();
    //         // what to do with result? (TOASK)
    //         // testMap.set("AANB504", '{"result":[{"tier_eighty_five":1,"tier_ninety":8,"Title":"rsrch methdlgy","Section":"002","Detail":"","tier_seventy_two":0,"Other":1,"Low":89,"tier_sixty_four":0,"id":31379,"tier_sixty_eight":0,"tier_zero":0,"tier_seventy_six":0,"tier_thirty":0,"tier_fifty":0,"Professor":"","Audit":9,"tier_g_fifty":0,"tier_forty":0,"Withdrew":1,"Year":"2015","tier_twenty":0,"Stddev":2.65,"Enrolled":20,"tier_fifty_five":0,"tier_eighty":0,"tier_sixty":0,"tier_ten":0,"High":98,"Course":"504","Session":"w","Pass":9…gy", "Section": "overall", "Detail": "", "tier_seventy_two": 0, "Other": 1, "Low": 89, "tier_sixty_four": 0, "id": 31380, "tier_sixty_eight": 0, "tier_zero": 0, "tier_seventy_six": 0, "tier_thirty": 0, "tier_fifty": 0, "Professor": "", "Audit": 9, "tier_g_fifty": 0, "tier_forty": 0, "Withdrew": 1, "Year": "2015", "tier_twenty": 0, "Stddev": 2.65, "Enrolled": 20, "tier_fifty_five": 0, "tier_eighty": 0, "tier_sixty": 0, "tier_ten": 0, "High": 98, "Course": "504", "Session": "w", "Pass": 9, "Fail": 0, "Avg": 94.44, "Campus": "ubc", "Subject": "aanb"}], "rank": 0}');
    //         function replacer(key: any, value: any) {
    //             if (value instanceof Map) {
    //                 return {
    //                     dataType: 'Map',
    //                     value: Array.from(value.entries()),
    //                 };
    //             } else {
    //                 return value;
    //             }
    //         }

    //         function reviver(key: any, value: any) {
    //             if (typeof value === 'object' && value !== null) {
    //                 if (value.dataType === 'Map') {
    //                     return new Map(value.value);
    //                 }
    //             }
    //             return value;
    //         }

    //         // const str = JSON.stringify(testMap, replacer);
    //         // this.addedMap.set(id, testMap);
    //         // fse.writeFileSync("./data/" + id + ".txt", str); //TOASK5 sync or async for file commands
    //         // let addedIds = Array.from(this.addedMap.keys());
    //         // let data = fse.readFileSync("./data/courses.txt");
    //         // const newValue = JSON.parse(data, reviver);
    //         return Promise.reject("Not implemented.");
    //     })
    //     return Promise.reject("Not implemented.");
    // }  https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetMap = new Map();
        // this.parseCourseData("test");
        // return Promise.reject(new InsightError());
        // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
        newZip.loadAsync(content, { base64: true }).then(function (zip: any) {
            let promisesArr = [Promise];
            zip.folder("courses").forEach(function (relativePath: any, file: any) {
                let name = file.name.replace("courses/", "");
                promisesArr.push(file.async("string").then(function (content: any) {  //TOASKNEW1
                    // this.parseCourseData(id, content).then(function (courseData: any) {
                    //     dataSetMap.set(name, courseData);
                    //     // ?? name async ? JSONPARSE
                    //     // } use a class for getting right fields? (TOASK2)
                    //     // ...then
                        
                    // })
                    dataSetMap.set(name, content);
                })
                )
            });
            Promise.all(promisesArr)
                .catch() // InsightError?
                .then(() => {
                    function replacer(key: any, value: any) {
                            if (value instanceof Map) {
                                return {
                                    dataType: 'Map',
                                    value: Array.from(value.entries()),
                                };
                            } else {
                                return value;
                            }
                    }
                    const str = JSON.stringify(dataSetMap, replacer);
                    try {
                        fse.writeFileSync("./data/" + id + ".txt", str);
                    } catch (err) {
                        Log.info("error w/ saving");
                    }
                    this.addedMap.set(id, dataSetMap);
                    Log.info(this.addedMap);
                    let addedIds = Array.from(this.addedMap.keys());
                    return Promise.resolve(addedIds);
            });
        }).catch(() => {
            Log.info("not here");
            return Promise.reject("Not implemented.");
        })
        return Promise.reject(new InsightError()); //return Promise.resolve(addedIds);
    }

    public removeDataset(id: string): Promise<string> {
        
        // if (this.validId(id) === false) {
        //     return Promise.reject(new InsightError());
        // }
        // if (!this.addedMap.has(id)) {
        //     return Promise.reject(new NotFoundError());
        // }

        //fs.removeSync()
        // use unlink for async TODO if running time too long
        // fse.unlinkSync("./data/" + id + ".txt");
        // this.addedMap.delete(id);
        // let res = id;
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }
  
    public listDatasets(): Promise<InsightDataset[]> {
        let emptyList: InsightDataset[] = [];
        return Promise.reject("Not implemented.");
    }

    // https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
    // function replacer(key: any, value: any) {
    //     if(value instanceof Map) {
    //       return {
    //         dataType: 'Map',
    //         value: Array.from(value.entries()), // or with spread: value: [...value]
    //       };
    //     } else {
    //       return value;  
    //     }
    // }
    
    private reviver(key: any, value: any) {
        if(typeof value === 'object' && value !== null) {
          if (value.dataType === 'Map') {
            return new Map(value.value);
          }
        }
        return value;
      }

    private validId(id: string): boolean {
        // https://stackoverflow.com/questions/2031085/how-can-i-check-if-string-contains-characters-whitespace-not-just-whitespace/6610847
        if ((/\S/.test(id)) || (id.includes("_"))) {
            // (this.addedMap.has(id)
            return false;
            // string is not empty and not just whitespace, need to add more checks here
        } else {
            return true;
        }   
    }
    // https://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory-store-them-in-objects-and-send-the-object
    private loadDiskDatasets() {
        let resMap = new Map();
        
        function reviver(key: any, value: any) {
            if(typeof value === 'object' && value !== null) {
              if (value.dataType === 'Map') {
                return new Map(value.value);
              }
            }
            return value;
          }
        fse.readdir("./data/", function (err: any, filenames: any) {
            if (err) {
                Log.info("Failed directory read");
                return;
            }
            filenames.forEach(function (filename: any) {
                let data = fse.readFileSync(filename);
                let name = filename.name.replace("courses/", "");
                const newMapValue = JSON.parse(data, this.reviver());
                resMap.set(name, newMapValue);
            })
        });
        return resMap;
    }
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482
    parseCourseData(id: string, content: string): string {
        // Object.fromEntries = arr => Object.assign({}, ...Array.from(arr, ([k, v]) => ({[k]: v}) ));
        const courseKeys = [
            "Subject", // CPSC
            "Section",
            "Professor",
            "Audit",
            "Year",
            "Course", //310
            "Title",
            "Pass",
            "Fail",
            "Avg",
            "id"
        ]
        // what to do with result/rank? do we keep it?
        let dummy = '{"result":[{"tier_eighty_five":1,"tier_ninety":8,"Title":"rsrch methdlgy","Section":"002","Detail":"","tier_seventy_two":0,"Other":1,"Low":89,"tier_sixty_four":0,"id":31379,"tier_sixty_eight":0,"tier_zero":0,"tier_seventy_six":0,"tier_thirty":0,"tier_fifty":0,"Professor":"","Audit":9,"tier_g_fifty":0,"tier_forty":0,"Withdrew":1,"Year":"2015","tier_twenty":0,"Stddev":2.65,"Enrolled":20,"tier_fifty_five":0,"tier_eighty":0,"tier_sixty":0,"tier_ten":0,"High":98,"Course":"504","Session":"w","Pass":"9…gy", "Section": "overall", "Detail": "", "tier_seventy_two": 0, "Other": 1, "Low": 89, "tier_sixty_four": 0, "id": 31380, "tier_sixty_eight": 0, "tier_zero": 0, "tier_seventy_six": 0, "tier_thirty": 0, "tier_fifty": 0, "Professor": "", "Audit": 9, "tier_g_fifty": 0, "tier_forty": 0, "Withdrew": 1, "Year": "2015", "tier_twenty": 0, "Stddev": 2.65, "Enrolled": 20, "tier_fifty_five": 0, "tier_eighty": 0, "tier_sixty": 0, "tier_ten": 0, "High": 98, "Course": "504", "Session": "w", "Pass": 9, "Fail": 0, "Avg": 94.44, "Campus": "ubc", "Subject": "aanb"}], "rank": 0}';
        let obj = JSON.parse(dummy);
        let sectionOverall = false;
        let newYearKey = "";
        // let newJSON = {
        //     [key: String]: any //TOASKNEW2
        // };
        Object.keys(obj.result[0]).forEach((key) => {
            if (courseKeys.indexOf(key) !== -1) {
                Log.info(key);
                if (key == "Section") {
                    if (obj.result[0][key] == "overall") {
                        sectionOverall = true;
                    }
                    return;
                }
                //let newKey = this.convertKeysWithId(id, key);
                // if (key == "Year") {
                //     newYearKey = newKey;
                // }
                //let newVal = this.enforceTypes(key, obj.result[0][key])
                // newJSON[key] = obj.result[0][key];
            }
        })

        // if (sectionOverall === true) {
        //     newJSON[newYearKey] = 1900;
        // }
        
        return "";
    }
    convertKeysWithId(id: string, key: string): string {
        let newKey = "";
        switch (key) {
            case "Subject":
                newKey = "dept";
                break;
            case "Course":
                newKey = "id";
                break;
            case "Avg":
                newKey = "avg";
                break;
            case "Professor":
                newKey = "instructor";
                break;
            case "Title":
                newKey = "title";
                break;
            case "Pass":
                newKey = "pass";
                break;
            case "Fail":
                newKey = "fail";
                break;
            case "Audit":
                newKey = "audit";
                break;
            case "id":
                newKey = "uuid";
                break;
            case "Year":
                newKey = "year";
        }
        return id + "_" + newKey;
    }
    //what happens if string can't be converted to num -> insight error?
    enforceTypes(key: string, val: any): any{
        let newVal;
        switch (key) {
            case "Avg":
            case "Pass":
            case "Fail":
            case "Audit":
            case "Year":
                newVal = Number(val);
                break;
            case "Subject":
            case "id":
            case "Professor":
            case "Course":
            case "Title":
                newVal = String(val);
        }
        return newVal;
    }
}
