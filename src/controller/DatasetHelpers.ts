import * as http from "http";
export default class DatasetHelper {
    public validateSections(data: any, keys: string[]): boolean {
        // has all needed categories TODO TEST
        let bool: boolean = true;
        for (const key of keys) {
            if (!data.hasOwnProperty(key)) {
                return bool = false;
            }
        }
        return bool;
    }

    // what happens if string can't be converted to num -> insight error? TODO, TOASK
    public enforceTypes(key: string, val: any): any {
        // try catch and skip erroneous converts
        let newVal: any;
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

    public convertKeysWithId(id: string, key: string): string {
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

    public validId(id: string): boolean {
        // TODO TEST regex more
        // https://stackoverflow.com/questions/2031085/
        // how-can-i-check-if-string-contains-characters-whitespace-not-just-whitespace/6610847
        if ((id === null) || (id === undefined) || (!/\S/.test(id)) ||
            (id.includes("_") || (!/^[^_]+$/.test(id)))) {
            return false;
            // string is not empty and not just whitespace, need to add more checks here
        } else {
            return true;
        }
    }
    // https://stackoverflow.com/questions/54905976/how-do-i-filter-keys-from-json-in-node-js
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482

    public parseCourseData(id: string, content: string): any[] {
        // how to check if all course keys needed are in the json, length?
        const courseKeys = [
            "Subject", // CPSC
            "Section",
            "Professor",
            "Audit",
            "Year",
            "Course", // 310
            "Title",
            "Pass",
            "Fail",
            "Avg",
            "id"
        ];
        let jsonObj = JSON.parse(content);
        let newYearKey = "";
        let newJSONArr: any = [];
        jsonObj.result.forEach((ele: any) => {
            let newJSON: any = {};
            let sectionOverall: boolean = false;
            if (this.validateSections(ele, courseKeys) === false) {
                return;
            }
            Object.keys(ele).forEach((key) => {
                if (courseKeys.indexOf(key) !== -1) {
                    if (key === "Section") {
                        if (ele[key] === "overall") {
                            sectionOverall = true;
                        }
                        return;
                    }
                    let newKey = this.convertKeysWithId(id, key);
                    if (key === "Year") {
                        newYearKey = newKey;
                    }
                    let newVal = this.enforceTypes(key, ele[key]);
                    newJSON[newKey] = newVal;
                }
            });
            if (sectionOverall) {
                newJSON[newYearKey] = 1900;
            }
            newJSONArr.push(newJSON);
        });
        return newJSONArr;
    }

    // https://stackoverflow.com/questions/19539391/how-to-get-data-out-of-a-node-js-http-get-request
    // https://stackoverflow.com/questions/38533580/nodejs-how-to-promisify-http-request-reject-got-called-two-times
    public requestLatLon(address: string): Promise<any> {
        let path = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team226/";
        let reqAdd = address.replace(/ /g, "%20");
        path = path + reqAdd;
        return new Promise((resolve, reject) => {
            let req = http.get(path, (res) => {
                const { statusCode } = res;
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

    public parseBuilding(element: any): Promise<any[]> {
        let buildingInfo: any = {};
        let bldgsRoomsArr: any[] = [];
        let stack: any[] = [];
        stack.push(element);

        while (stack.length > 0) {
            let curr = stack.pop();
            this.mapRoomValues(curr, buildingInfo, bldgsRoomsArr);
            if (curr.childNodes) {
                curr.childNodes?.reverse().forEach((child: any) => {
                    stack.push(child);
                });
            }
        }
        if (bldgsRoomsArr.length > 0) {
            return this.requestLatLon(buildingInfo["address"]).then((latlon: any) => {
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

    private mapRoomValues(curr: any, buildingInfo: any, bldgsRoomsArr: any[]) {
        if (curr.nodeName === "div" && curr.attrs.filter((e: any) => e.name === "id"
            && e.value === "building-info").length > 0) {
                if (curr.childNodes[1] && curr.childNodes[1].childNodes
                    && curr.childNodes[1].childNodes[0].nodeName === "span") {
                    buildingInfo["fullname"] = curr.childNodes[1].childNodes[0].childNodes[0].value;
                }
                if (curr.childNodes[3]
                    && curr.childNodes[3].attrs.filter((e: any) => e.value === "building-field").length > 0) {
                    buildingInfo["address"] = curr.childNodes[3].childNodes[0].childNodes[0].value;
                }
        }
        if (curr.nodeName === "link" && curr.attrs.filter((e: any) => e.name === "rel"
            && e.value === "canonical").length > 0 && curr.attrs.filter((e: any) => e.name === "href").length > 0) {
                buildingInfo["shortname"] = curr.attrs[1].value;
        }
        if (curr.nodeName === "tbody") {
            for (const child of curr.childNodes) {
                let roomsInfo: any = {};
                if (child.nodeName === "tr") {
                    for (const inner of child.childNodes) {
                        if (inner.attrs) {
                            if (inner.attrs[0].value === "views-field views-field-field-room-number") {
                                if (inner.childNodes[1].attrs[0].name === "href") {
                                    roomsInfo["rooms_href"] = inner.childNodes[1].attrs[0].value;
                                    roomsInfo["rooms_number"] = inner.childNodes[1].childNodes[0].value;
                                }
                            }
                            if (inner.attrs[0].value === "views-field views-field-field-room-capacity") {
                                roomsInfo["rooms_seats"] = Number(inner.childNodes[0].value.replace("\n", "").trim());
                            } // TODO weird 0 and check for thrown/all fields
                            if (inner.attrs[0].value === "views-field views-field-field-room-furniture") {
                                roomsInfo["rooms_furniture"] = inner.childNodes[0].value.replace("\n", "").trim();
                            }
                            if (inner.attrs[0].value === "views-field views-field-field-room-type") {
                                roomsInfo["rooms_type"] = inner.childNodes[0].value.replace("\n", "").trim();
                            }
                        }
                    }
                }
                if (Object.keys(roomsInfo).length > 0) {
                    roomsInfo["rooms_fullname"] = buildingInfo["fullname"];
                    roomsInfo["rooms_shortname"] = buildingInfo["shortname"];
                    roomsInfo["rooms_name"] = buildingInfo["shortname"] + "_" + roomsInfo["rooms_number"];
                    roomsInfo["rooms_address"] = buildingInfo["address"];
                    bldgsRoomsArr.push(roomsInfo);
                }
            }
        }
    }
}
