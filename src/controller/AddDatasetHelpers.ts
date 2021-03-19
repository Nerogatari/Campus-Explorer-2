import * as parse5 from "parse5";

export default class AddDatasetHelper {
    // https://github.students.cs.ubc.ca/falkirks/c2_parsing/blob/master/src/MemeViewer.ts
    public parseHTML(html: string): Promise<any> {
        return Promise.resolve(parse5.parse(html));
    }

    // https://medium.com/swlh/depth-first-and-breadth-first-dom-traversal-explained-for-real-86244fbf9854
    public findBuildings(element: any): string[] {
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
    public async parseIndex(content: string): Promise<string[]> {
        let bldgsArr: string[] = [];
        return this.parseHTML(String(content)).then((parsedData: any) => {
            bldgsArr = this.findBuildings(parsedData);
            return Promise.resolve(bldgsArr);
        });
    }
    public filterIndex(unzip: any): any {
        let index = unzip.filter((relativePath: any, fILE: any) => {
            let fileName = fILE.name.replace("rooms/", "");
            if (fileName === "index.htm") {
                return true;
            }
        });
        return index;
    }
}
