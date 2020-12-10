export function remove0x(str: string): string {
    if (str.startsWith("0x")) {
        return str.slice(2);
    } else {
        return str;
    }
}

export function isNull(str): boolean {
    if (str === "") return true;
    if (str === undefined) return true;
    if (str === null) return true;
    if (JSON.stringify(str) === "{}") return true;
    let regu = "^[ ]+$";
    let re = new RegExp(regu);
    return re.test(str);
}

export function add0x(str: string): string {
    if (str.startsWith("0x")) {
        return str;
    } else {
        return "0x" + str;
    }
}
