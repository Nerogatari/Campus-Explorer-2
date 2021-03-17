import Log from "../Util";
import Decimal from "decimal.js";

export function performTransform(sections: object[], transform: any, id: string): any {
    Log.trace(transform);


    let mappedGroup: Map<string, any[]> = new Map<string, any[]>();
    for (let section of sections) {
        // check if GROUP is empty
        let groupKeys = transform.GROUP;
        // get map key
        let mapKey = "";
        for (let groupKey of groupKeys) {
            // @ts-ignore
            mapKey += String(section[groupKey]);
        }
        if (mappedGroup.has(mapKey)) {
            mappedGroup.get(mapKey).push(section);
        } else {
            mappedGroup.set(mapKey, [section]);
        }
    }
    // execute apply
    let groupedSections = [];
    for (let currGroup of mappedGroup.values()) {
        // create new columns using apply
        let groupedSection: any = {};
        for (let groupKey of transform.GROUP) {
            groupedSection[groupKey] = currGroup[0][groupKey];
        }
        // check if APPLY is empty
        for (let apply1 of transform.APPLY) {
            let applyKey = Object.keys(apply1)[0];
            let applyRule = apply1[applyKey];
            groupedSection[applyKey] = executeApply(currGroup, applyRule);
        }
        groupedSections.push(groupedSection);
    }
    Log.trace(groupedSections);
    return groupedSections;
}

// TODO: parameter of dataKind
// execute apply returns a number
const executeApply = (currGroup: any, applyRule: any): number => {
    let applyToken = Object.keys(applyRule)[0];
    let key = applyRule[applyToken];
    // get array of every section's key
    // dataArray = [89.9,90.39,78.39]
    let dataArray = currGroup.map((section: any) => {
        return section[key];
        // test if key is number key
    });
    switch (applyToken) {
        case "SUM":
            let sum = dataArray.reduce((retval: any, value: any) => {
                return retval + value;
            });
            return Number(sum.toFixed(2));
        case "AVG":
            // Convert your each value to Decimal (e.g., new Decimal(num))
            // Add the numbers being averaged using Decimal's .add() method (e.g., building up a variable called total).
            // Calculate the average (let avg = total.toNumber() / numRows). numRows should not be converted to Decimal.
            // Round the average to the second decimal digit with toFixed(2) and cast back to number type
            let totalDecimal = dataArray.map((num: any) => {
                return new Decimal(num);
            });
            let sum2 = totalDecimal.reduce((retval: any, value: any) => {
                return retval + value;
            });
            let avg = sum2 / dataArray.length;
            return Number(avg.toFixed(2));
    }
};
